/* eslint-disable class-methods-use-this,max-lines */

import ShowIf from 'app/App/ShowIf';
import { filterOptions } from 'app/Forms/utils/optionsUtils';
import { t } from 'app/I18N';
import { TriStateSelectValue } from 'app/istore';
import { Icon as CustomIcon } from 'app/Layout/Icon';
import React, { Component } from 'react';
import { Icon } from 'UI';

export type Option = { options?: Option[]; results?: number } & { [k: string]: any };
enum SelectStates {
  OFF,
  PARTIAL,
  ON,
}

const defaultProps = {
  optionsLabel: 'label',
  optionsValue: 'value',
  prefix: '',
  options: [] as Option[],
  filter: '',
  optionsToShow: 5,
  showAll: false,
  hideSearch: false,
  sort: false,
  sortbyLabel: false,
  forceHoist: false,
  placeholder: '',
  onChange: (_v: any) => {},
};

export type MultiSelectProps<ValueType> = typeof defaultProps & {
  value: ValueType;
};

export interface MultiSelectState {
  filter: string;
  showAll: boolean;
  ui: { [k: string]: boolean };
}

const isNotAnEmptyGroup = (option: Option) => !option.options || option.options.length;

abstract class MultiSelectBase<ValueType> extends Component<
  MultiSelectProps<ValueType>,
  MultiSelectState
> {
  static defaultProps = defaultProps;

  constructor(props: MultiSelectProps<ValueType>) {
    super(props);
    this.state = { filter: props.filter, showAll: props.showAll, ui: {} };
    this.filter = this.filter.bind(this);
    this.resetFilter = this.resetFilter.bind(this);
    this.showAll = this.showAll.bind(this);
  }

  componentWillReceiveProps(props: MultiSelectProps<ValueType>) {
    if (props.filter) {
      this.setState({ filter: props.filter });
    }
  }

  abstract markChecked(value: ValueType, option: Option): ValueType;

  abstract markUnchecked(value: ValueType, option: Option): ValueType;

  abstract getCheckedList(): string[];

  getPartialList(): string[] {
    return [];
  }

  getPinnedList(): string[] {
    return [];
  }

  changeGroup(group: Option, e: React.ChangeEvent<HTMLInputElement>) {
    let { value } = this.props;
    if (e.target.checked) {
      group.options!.forEach(_item => {
        if (this.checked(_item) !== SelectStates.ON) {
          value = this.markChecked(value, _item);
        }
      });
    }

    if (!e.target.checked) {
      group.options!.forEach(_item => {
        if (this.checked(_item) !== SelectStates.OFF) {
          value = this.markUnchecked(value, _item);
        }
      });
    }
    this.props.onChange(value);
  }

  checked(option: Option): SelectStates {
    if (!this.props.value) {
      return SelectStates.OFF;
    }

    const checkedList = this.getCheckedList();
    const partialList = this.getPartialList();

    if (option.options) {
      const numChecked = option.options.reduce(
        (nc, _option) => nc + (checkedList.includes(_option[this.props.optionsValue]) ? 1 : 0),
        0
      );
      const numPartial = option.options.reduce(
        (np, _option) => np + (partialList.includes(_option[this.props.optionsValue]) ? 1 : 0),
        0
      );
      if (numChecked === option.options.length) {
        return SelectStates.ON;
      }
      if (numChecked + numPartial > 0) {
        return SelectStates.PARTIAL;
      }
      return SelectStates.OFF;
    }
    if (checkedList.includes(option[this.props.optionsValue])) {
      return SelectStates.ON;
    }
    if (partialList.includes(option[this.props.optionsValue])) {
      return SelectStates.PARTIAL;
    }
    return SelectStates.OFF;
  }

  change(option: Option) {
    let { value } = this.props;
    if (this.checked(option) === SelectStates.ON) {
      value = this.markUnchecked(value, option);
    } else {
      value = this.markChecked(value, option);
    }
    this.props.onChange(value);
  }

  filter(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ filter: e.target.value });
  }

  resetFilter() {
    this.setState({ filter: '' });
  }

  showAll(e: React.MouseEvent) {
    e.preventDefault();
    this.setState(prevState => ({ showAll: !prevState.showAll }));
  }

  sort(options: Option[], isSubGroup = false) {
    const { optionsValue, optionsLabel } = this.props;
    const pinnedList = this.getPinnedList();
    const sortedOptions = options.sort((a, b) => {
      const aPinned = this.checked(a) !== SelectStates.OFF || pinnedList.includes(a[optionsValue]);
      const bPinned = this.checked(b) !== SelectStates.OFF || pinnedList.includes(b[optionsValue]);
      let sorting = 0;
      if (!this.state.showAll) {
        sorting = (bPinned ? 1 : 0) - (aPinned ? 1 : 0);
      }

      if (sorting === 0 && typeof options[0].results !== 'undefined' && a.results !== b.results) {
        sorting = (a.results || 0) > (b.results || 0) ? -1 : 1;
      }

      const showingAll = this.state.showAll || options.length < this.props.optionsToShow;
      if (sorting === 0 || showingAll || this.props.sortbyLabel || isSubGroup) {
        sorting = a[optionsLabel] < b[optionsLabel] ? -1 : 1;
      }

      return sorting;
    });

    return this.moveNoValueOptionToBottom(sortedOptions);
  }

  sortOnlyAggregates(options: Option[]) {
    const { optionsLabel } = this.props;
    if (!options.length || typeof options[0].results === 'undefined') {
      return options;
    }
    const sortedOptions = options.sort((a, b) => {
      let sorting = (b.results || 0) - (a.results || 0);

      if (sorting === 0) {
        sorting = a[optionsLabel] < b[optionsLabel] ? -1 : 1;
      }

      return sorting;
    });
    return this.moveNoValueOptionToBottom(sortedOptions);
  }

  moveNoValueOptionToBottom(options: Option[]) {
    let _options = [...options];
    ['any', 'missing'].forEach(bottomId => {
      const bottomOption = _options.find(opt => opt.id === bottomId);
      if (bottomOption && this.checked(bottomOption) === SelectStates.OFF) {
        _options = _options.filter(opt => opt.id !== bottomId);
        _options.push(bottomOption);
      }
    });
    return _options;
  }

  hoistCheckedOptions(options: Option[]) {
    const [checkedOptions, otherOptions] = options.reduce(
      ([checked, others], option) => {
        if (this.checked(option) !== SelectStates.OFF) {
          return [checked.concat([option]), others];
        }
        return [checked, others.concat([option])];
      },
      [[] as Option[], [] as Option[]]
    );
    const partitionedOptions = checkedOptions.concat(otherOptions);
    return this.moveNoValueOptionToBottom(partitionedOptions);
  }

  moreLessLabel(totalOptions: Option[]) {
    if (this.state.showAll) {
      return t('System', 'x less');
    }
    return (
      <span>
        {totalOptions.length - this.props.optionsToShow} {t('System', 'x more')}
      </span>
    );
  }

  toggleOptions(group: Option, e: React.MouseEvent) {
    e.preventDefault();
    const groupKey = group[this.props.optionsValue];
    const { ui } = this.state;
    ui[groupKey] = !ui[groupKey];
    this.setState({ ui });
  }

  showSubOptions(parent: Option) {
    const toggled = this.state.ui[parent.id];
    return toggled || this.checked(parent) !== SelectStates.OFF;
  }

  label(option: Option) {
    const { optionsValue, optionsLabel, prefix } = this.props;
    return (
      <label className="multiselectItem-label" htmlFor={prefix + option[optionsValue]}>
        <span className="multiselectItem-icon">
          <Icon icon={['far', 'square']} className="checkbox-empty" />
          <Icon icon="check" className="checkbox-checked" />
          <Icon icon="minus" className="checkbox-partial" />
        </span>
        <span className="multiselectItem-name">
          <CustomIcon className="item-icon" data={option.icon} />
          {option[optionsLabel]}
        </span>
        <span className="multiselectItem-results">
          {option.results && <span>{option.results}</span>}
          {option.options && (
            <span
              className="multiselectItem-action"
              onClick={this.toggleOptions.bind(this, option)}
            >
              <Icon icon={this.state.ui[option.id] ? 'caret-up' : 'caret-down'} />
            </span>
          )}
        </span>
      </label>
    );
  }

  renderGroup(group: Option, index: number) {
    const { prefix } = this.props;
    const _group = Object.assign({}, group, { results: group.results });
    return (
      <li key={index} className="multiselect-group">
        <div className="multiselectItem">
          <input
            type="checkbox"
            className={`group-checkbox multiselectItem-input${
              this.checked(group) === SelectStates.PARTIAL ? ' partial' : ''
            }`}
            id={prefix + group.id}
            onChange={this.changeGroup.bind(this, group)}
            checked={this.checked(group) !== SelectStates.OFF}
          />
          {this.label(_group)}
        </div>
        <ShowIf if={this.showSubOptions(group)}>
          <ul className="multiselectChild is-active">
            {group.options!.map((_item, i) => this.renderOption(_item, i, index.toString()))}
          </ul>
        </ShowIf>
      </li>
    );
  }

  renderOption(option: Option, index: number, groupIndex = '') {
    const { optionsValue, optionsLabel, prefix } = this.props;
    const key = `${groupIndex}${index}`;
    return (
      <li className="multiselectItem" key={key} title={option[optionsLabel]}>
        <input
          type="checkbox"
          className={`multiselectItem-input${
            this.checked(option) === SelectStates.PARTIAL ? ' partial' : ''
          }`}
          value={option[optionsValue]}
          id={prefix + option[optionsValue]}
          onChange={this.change.bind(this, option)}
          checked={this.checked(option) !== SelectStates.OFF}
        />
        {this.label(option)}
      </li>
    );
  }

  render() {
    const { optionsLabel, placeholder } = this.props;

    let options = this.props.options.slice();
    const totalOptions = options.filter(option => {
      let notDefined;
      return (
        isNotAnEmptyGroup(option) &&
        (option.results === notDefined ||
          option.results > 0 ||
          !option.options ||
          option.options.length ||
          this.checked(option))
      );
    });
    options = totalOptions;
    options = options.map(option => {
      if (!option.options) {
        return option;
      }
      return {
        ...option,
        options: option.options.filter(_opt => {
          let notDefined;
          return _opt.results === notDefined || _opt.results > 0 || this.checked(_opt);
        }),
      };
    }) as Option[];

    if (this.state.filter) {
      options = filterOptions(this.state.filter, options, optionsLabel);
    }

    const tooManyOptions = !this.state.showAll && options.length > this.props.optionsToShow;

    if (this.props.sort) {
      options = this.sort(options);
    } else {
      options = this.sortOnlyAggregates(options);
    }

    if (this.props.forceHoist || (!this.props.sort && !this.state.showAll)) {
      options = this.hoistCheckedOptions(options);
    }

    if (tooManyOptions) {
      const numberOfActiveOptions = options.filter(opt => this.checked(opt)).length;
      const optionsToShow =
        this.props.optionsToShow > numberOfActiveOptions
          ? this.props.optionsToShow
          : numberOfActiveOptions;
      options = options.slice(0, optionsToShow);
    }

    options = options.map(option => {
      if (!option.options) {
        return option;
      }
      return { ...option, options: this.sort(option.options, true) };
    }) as Option[];

    return (
      <ul className="multiselect is-active">
        <li className="multiselectActions">
          <ShowIf
            if={this.props.options.length > this.props.optionsToShow && !this.props.hideSearch}
          >
            <div className="form-group">
              <Icon
                icon={this.state.filter ? 'times-circle' : 'search'}
                onClick={this.resetFilter}
              />
              <input
                className="form-control"
                type="text"
                placeholder={placeholder || t('System', 'Search item', null, false)}
                value={this.state.filter}
                onChange={this.filter}
              />
            </div>
          </ShowIf>
        </li>
        {!options.length && <span>{t('System', 'No options found')}</span>}
        {options.map((option, index) => {
          if (option.options) {
            return this.renderGroup(option, index);
          }

          return this.renderOption(option, index);
        })}

        <li className="multiselectActions">
          <ShowIf if={totalOptions.length > this.props.optionsToShow && !this.state.showAll}>
            <button onClick={this.showAll} className="btn btn-xs btn-default">
              <Icon icon={this.state.showAll ? 'caret-up' : 'caret-down'} />
              &nbsp;
              {this.moreLessLabel(totalOptions)}
            </button>
          </ShowIf>
        </li>
      </ul>
    );
  }
}

export default class MultiSelect extends MultiSelectBase<string[]> {
  static defaultProps = { ...defaultProps, value: [] as string[] };

  markChecked(value: string[], option: Option): string[] {
    const newValue = value.slice(0);
    newValue.push(option[this.props.optionsValue]);
    return newValue;
  }

  markUnchecked(value: string[], option: Option): string[] {
    const opt = option[this.props.optionsValue];
    if (!value.includes(opt)) {
      return value;
    }
    const newValue = value.slice(0);
    newValue.splice(value.indexOf(opt));
    return newValue;
  }

  getCheckedList(): string[] {
    return this.props.value || [];
  }
}

export class MultiSelectTristate extends MultiSelectBase<TriStateSelectValue> {
  static defaultProps = { ...defaultProps, value: {} as TriStateSelectValue };

  markChecked(value: TriStateSelectValue, option: Option): TriStateSelectValue {
    const opt = option[this.props.optionsValue];
    const newValue = { ...value, added: value.added.slice(0), removed: value.removed.slice(0) };
    newValue.removed = value.removed.filter(v => v !== opt);
    if (value.originalFull.includes(opt)) {
      return newValue;
    }
    // Flip originally partial options from off to partial, and then from partial to on.
    if (!value.originalPartial.includes(opt) || !value.removed.includes(opt)) {
      newValue.added.push(opt);
    }
    return newValue;
  }

  markUnchecked(value: TriStateSelectValue, option: Option): TriStateSelectValue {
    const opt = option[this.props.optionsValue];
    const newValue = { ...value, added: value.added.slice(0), removed: value.removed.slice(0) };
    if (value.originalFull.includes(opt) || value.originalPartial.includes(opt)) {
      newValue.removed.push(option[this.props.optionsValue]);
    }
    newValue.added = value.added.filter(v => v !== option[this.props.optionsValue]);
    return newValue;
  }

  getCheckedList(): string[] {
    const { value } = this.props;
    return value.originalFull.filter(v => !value.removed.includes(v)).concat(value.added);
  }

  getPartialList(): string[] {
    const { value } = this.props;
    return value.originalPartial.filter(v => !value.removed.includes(v));
  }

  getPinnedList(): string[] {
    const { value } = this.props;
    return value.originalPartial.concat(value.originalFull);
  }
}
