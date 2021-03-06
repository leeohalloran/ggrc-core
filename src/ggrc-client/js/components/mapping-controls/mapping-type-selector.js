/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './mapping-type-selector.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('mappingTypeSelector', {
    tag: 'mapping-type-selector',
    template: template,
    viewModel: {
      disabled: false,
      readonly: false,
      types: [],
      selectedType: '',
    },
    init: function () {
      let selectedType = this.viewModel.selectedType;
      let types = this.viewModel.types;
      let groups = ['business', 'entities', 'governance'];
      let values = [];

      groups.forEach(function (name) {
        let groupItems = types.attr(name + '.items');
        values = values.concat(_.pluck(groupItems, 'value'));
      });
      if (values.indexOf(selectedType) < 0) {
        this.viewModel.attr('selectedType', values[0]);
      }
    },
  });
})(window.can, window.GGRC);
