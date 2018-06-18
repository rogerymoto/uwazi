import React from 'react';

import HtmlToReact, { Parser } from 'html-to-react';
import instanceMarkdownIt from 'markdown-it';
import mdContainer from 'markdown-it-container';

const myParser = new Parser();
const processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions(React);
const customComponentMatcher = '{\\w+}\\(.+\\)\\(.+\\)|{\\w+}\\(.+\\)';

const dynamicCustomContainersConfig = {
  validate() { return true; },
  render(tokens, idx) {
    const token = tokens[idx];

    if (token.nesting === 1) {
      return `<div class="${token.info.trim()}">`;
    }
    return '</div>';
  }
};


const markdownIt = instanceMarkdownIt().use(mdContainer, 'dynamic', dynamicCustomContainersConfig);
const markdownItWithHtml = instanceMarkdownIt({ html: true }).use(mdContainer, 'dynamic', dynamicCustomContainersConfig);

const getConfig = (string) => {
  const customComponentOptionsMatcher = /{\w+}(\(.+\)\(.+\))|{\w+}(\(.+\))/g;
  let config;
  const configMatch = customComponentOptionsMatcher.exec(string);
  if (configMatch) {
    config = configMatch[1] || configMatch[2];
  }

  return config;
};

export default (_markdown, callback, withHtml = false) => {
  let renderer = markdownIt;
  if (withHtml) {
    renderer = markdownItWithHtml;
  }

  const markdown = _markdown.replace(new RegExp(`(${customComponentMatcher})`, 'g'), '$1\n');
  const html = renderer.render(markdown).replace(new RegExp(`<p>(${customComponentMatcher})</p>`, 'g'), '<placeholder>$1</placeholder>');

  const isValidNode = (node) => {
    const isBadNode = node.type === 'tag' && node.name.match(/<|>/g);
    if (isBadNode) {
      return false;
    }
    return true;
  };

  const processingInstructions = [{
    shouldProcessNode() {
      return true;
    },
    processNode: (node, children, index) => {
      const customComponentTypeMatcher = /{(.+)}\(/;
      let type;
      let config;

      if (node.name === 'placeholder' && node.children && node.children[0] && node.children[0].data && node.children[0].data.match(customComponentMatcher)) {
        type = node.children[0].data.match(customComponentTypeMatcher)[1];
        config = getConfig(node.children[0].data);
      }

      if (node && (!node.parent || node.parent && node.parent.name !== 'placeholder') && node.data && node.data.match(customComponentMatcher)) {
        type = node.data.match(customComponentTypeMatcher)[1];
        config = getConfig(node.data);
      }


      if (type) {
        return callback(type, config, index);
      }

      return processNodeDefinitions.processDefaultNode(node, children, index);
    }
  }];


  return myParser.parseWithInstructions(html, isValidNode, processingInstructions);
};
