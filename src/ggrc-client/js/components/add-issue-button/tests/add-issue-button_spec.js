/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../add-issue-button';
import {REFRESH_RELATED} from '../../../events/eventTypes';
import * as CurrentPageUtils from '../../../plugins/utils/current-page-utils';

describe('GGRC.Components.addIssueButton', function () {
  'use strict';

  let Component;
  let viewModel;
  let events;

  beforeAll(function () {
    Component = GGRC.Components.get('addIssueButton');
    events = Component.prototype.events;
  });

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('addIssueButton');
  });

  describe('refreshIssueList() method', function () {
    let relatedInstance;
    let handler;
    let that;

    beforeEach(function () {
      that = {
        viewModel: viewModel,
      };
      relatedInstance = viewModel.attr('relatedInstance');
      spyOn(relatedInstance, 'dispatch');
      handler = events.refreshIssueList.bind(that);
    });

    describe('in case of Issue instance', function () {
      let issueWidgetName = 'Issue';
      let fakeIssueInstance;
      let fakePageInstance = {
        type: 'TYPE',
        id: 'ID',
      };

      beforeEach(function () {
        spyOn(CMS.Models, 'Issue');
        fakeIssueInstance = new CMS.Models.Issue();
        spyOn(CurrentPageUtils, 'initCounts');
        spyOn(GGRC, 'page_instance').and.returnValue(fakePageInstance);
      });

      it('should dispatch refreshInstance event ' +
        'and update Issues tab counts',
      function () {
        handler({}, {}, fakeIssueInstance);
        expect(CurrentPageUtils.initCounts).toHaveBeenCalledWith(
          [issueWidgetName],
          fakePageInstance.type,
          fakePageInstance.id
        );
        expect(relatedInstance.dispatch)
          .toHaveBeenCalledWith({
            ...REFRESH_RELATED,
            model: issueWidgetName,
          });
      }
      );
    });
  });

  describe('prepareJSON get() method', function () {
    let isJson;

    beforeEach(function () {
      viewModel.attr('relatedInstance', {
        'class': {},
      });
    });

    beforeAll(function () {
      isJson = function (str) {
        return !_.isError(_.attempt(JSON.parse, str));
      };
    });

    it('returns json-format string', function () {
      let result = viewModel.attr('prepareJSON');
      expect(isJson(result)).toBe(true);
    });

    describe('for returned json-format string', function () {
      it('sets assessment field', function () {
        let result;
        let relatedInstance = {
          title: 'title',
          id: 1,
          type: 'type',
          'class': {
            title_singular: 'title singular',
            table_singular: 'table singular',
          },
        };

        viewModel.attr('relatedInstance', relatedInstance);
        result = viewModel.attr('prepareJSON');
        expect(JSON.parse(result).assessment).toEqual({
          title: relatedInstance.title,
          id: relatedInstance.id,
          type: relatedInstance.type,
          title_singular: relatedInstance.class.title_singular,
          table_singular: relatedInstance.class.table_singular,
        });
      });
    });
  });
});
