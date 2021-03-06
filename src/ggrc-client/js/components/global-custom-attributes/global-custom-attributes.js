/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  CUSTOM_ATTRIBUTE_TYPE,
} from '../../plugins/utils/custom-attribute/custom-attribute-config';
import Permission from '../../permission';

(function (can, GGRC) {
  'use strict';

  /**
   * Global Custom Attributes is a component representing custom attributes.
   */
  GGRC.Components('globalCustomAttributes', {
    tag: 'global-custom-attributes',
    template: '<content/>',
    viewModel: {
      isAttributesDisabled: false,
      define: {
        /**
         * Indicates whether custome attributes can be edited.
         * @type {boolean}
         */
        isEditDenied: {
          type: 'boolean',
          get: function () {
            return this.attr('instance.snapshot') ||
              this.attr('instance.isRevision') ||
              this.attr('instance.archived') ||
              this.attr('isAttributesDisabled') ||
              this.isReadOnlyForInstance(this.attr('instance')) ||
              !Permission.is_allowed_for('update', this.attr('instance'));
          },
        },
      },
      instance: null,
      /**
       * Contains custom attributes.
       * @type {can.List}
       */
      items: [],
      isReadOnlyForInstance(instance) {
        if (!instance) {
          return false;
        }

        return instance.class.isProposable;
      },
      initCustomAttributes: function () {
        const instance = this.attr('instance');
        const result = instance
          .customAttr({
            type: CUSTOM_ATTRIBUTE_TYPE.GLOBAL,
          });
        this.attr('items', result);
      },
      saveCustomAttributes: function (event, field) {
        const caId = field.customAttributeId;
        const value = event.value;
        const instance = this.attr('instance');

        this.attr('isSaving', true);
        instance.customAttr(caId, value);
        instance.save()
          .done(function () {
            $(document.body).trigger('ajax:flash', {
              success: 'Saved',
            });
          })
          .fail(function () {
            $(document.body).trigger('ajax:flash', {
              error: 'There was a problem saving',
            });
          })
          .always(function () {
            this.attr('isSaving', false);
          }.bind(this));
      },
    },
    init: function () {
      this.viewModel.initCustomAttributes();
    },
    events: {
      '{viewModel.instance} readyForRender': function () {
        this.viewModel.initCustomAttributes();
      },
    },
  });
})(window.can, window.GGRC);
