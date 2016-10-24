import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import utils from '../utils';

export class I18NMenu extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {open: false};
  }

  toggle() {
    this.setState({open: !this.state.open});
  }

  changeLanguage(locale, url) {
    this.saveCookie(locale);
    this.reload(url);
  }

  reload(url) {
    window.location.href = url;
  }

  saveCookie(locale) {
    utils.saveLocale(locale);
  }

  render() {
    const languages = this.props.languages.toJS();
    let path = this.props.location.pathname;
    let locale = utils.getLocale(path, languages);

    let regexp = new RegExp(`^\/?${locale}\/|^\/?${locale}$`);
    path = path.replace(regexp, '/');

    return (
      <div className={this.state.open ? 'Dropdown is-active' : 'Dropdown'} onClick={this.toggle.bind(this)}>
        <ul className="Dropdown-list language">
          {(() => {
            return languages.map((lang) => {
              let url = `/${lang.key}${path}${this.props.location.search}`;
              return <li className={'Dropdown-option' + (locale === lang.key ? ' is-active' : '')} key={lang.key}>
                      <a href={url} onClick={this.changeLanguage.bind(this, lang.key, url)}>
                        {lang.key}
                      </a>
                     </li>;
            });
          })()}
        </ul>
        <span className="Dropdown-label">
          <i className="fa fa-caret-down"></i>
        </span>
      </div>
    );
  }
}

I18NMenu.propTypes = {
  languages: PropTypes.object,
  location: PropTypes.object
};

I18NMenu.contextTypes = {
  router: PropTypes.object
};

export function mapStateToProps({settings}) {
  return {
    languages: settings.collection.get('languages')
  };
}

export default connect(mapStateToProps)(I18NMenu);