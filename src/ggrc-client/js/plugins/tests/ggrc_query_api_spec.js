/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as QueryAPI from '../utils/query-api-utils';
import * as CurrentPageUtils from '../utils/current-page-utils';

describe('GGRC Utils Query API', function () {
  describe('buildParams() method', function () {
    let relevant;
    let objectName;
    let paging;
    let method;

    beforeEach(function () {
      paging = {
        current: 1,
        total: null,
        pageSize: 10,
        filter: '',
        count: 6,
      };

      method = QueryAPI.buildParams;
    });

    describe('Assessment related to Audit', function () {
      beforeEach(function () {
        relevant = {type: 'Audit', id: 1};
        objectName = 'Assessment';
      });

      it('return default params for paging request', function () {
        let result = method(objectName, paging, relevant)[0];

        expect(result.object_name).toEqual('Assessment');
        expect(result.limit).toEqual([0, 10]);
        expect(result.filters.expression.object_name).toEqual('Audit');
      });

      it('return limit for 3rd page', function () {
        let result;
        paging.current = 3;
        paging.pageSize = 50;

        result = method(objectName, paging, relevant)[0];

        expect(result.limit).toEqual([100, 150]);
      });
    });

    describe('Audit related to Assessment', function () {
      beforeEach(function () {
        relevant = {
          id: 1,
          type: 'Assessment',
        };
        objectName = 'Audit';
      });

      it('return default params for paging request', function () {
        let result = method(objectName, paging, relevant)[0];

        expect(result.object_name).toEqual('Audit');
        expect(result.limit).toEqual([0, 10]);
        expect(result.filters.expression.object_name).toEqual('Assessment');
      });

      it('return expression for filter', function () {
        let filterResult;
        paging.filter = 'status="in progress"';

        filterResult =
          method(objectName, paging, relevant)[0].filters.expression.right;

        expect(filterResult.left).toEqual('status');
        expect(filterResult.right).toEqual('in progress');
        expect(filterResult.op.name).toEqual('=');
      });
    });

    describe('Correct data for filter expression', function () {
      beforeEach(function () {
        relevant = {
          id: 28,
          type: 'foo',
          operation: 'op',
        };
        objectName = 'bar';
      });

      it('return correct ids', function () {
        let result = method(objectName, paging, relevant)[0];

        expect(result.filters.expression.ids.length).toEqual(1);
        expect(result.filters.expression.ids).toContain('28');
      });
    });

    describe('Assessments owned by the Person', function () {
      beforeEach(function () {
        relevant = {
          id: 1,
          type: 'Person',
          operation: 'owned',
        };
        objectName = 'Assessment';
      });

      it('return owned as operation type', function () {
        let result = method(objectName, paging, relevant)[0];

        expect(result.object_name).toEqual('Assessment');
        expect(result.filters.expression.object_name).toEqual('Person');
        expect(result.filters.expression.op.name).toEqual('owned');
      });
    });

    describe('filter builder', function () {
      let relevantType = 'dummyType1';
      let requestedType = 'dummyType2';
      let pageWithFilter = {filter: 'field = value'};
      let pageNoFilter = {filter: undefined};
      let relevant = {id: 1, type: relevantType};
      let additionalFilter = {
        expression: {
          op: {name: '~'},
          left: 'foo',
          right: 'bar',
        },
      };
      let result;

      var flattenOps = function (expression) {
        if (expression && expression.op) {
          return [expression.op.name].concat(flattenOps(expression.left))
            .concat(flattenOps(expression.right));
        }
        return [];
      };

      let checkOps = function (expression, expectedOps) {
        return _.isEqual(flattenOps(expression).sort(),
          expectedOps.sort());
      };

      it('returns empty expression for no filtering parameters', function () {
        result = method(requestedType, pageNoFilter, undefined, undefined)[0];

        expect(_.isObject(result.filters.expression)).toBe(true);
        expect(_.isEmpty(result.filters.expression)).toBe(true);
      });

      it('returns correct filters for just text filter',
        function () {
          result = method(requestedType, pageWithFilter, undefined,
            undefined)[0];

          expect(checkOps(result.filters.expression, ['='])).toBe(true);
        });

      it('returns correct filters for just relevant object',
        function () {
          result = method(requestedType, pageNoFilter, relevant,
            undefined)[0];

          expect(checkOps(result.filters.expression, ['relevant'])).toBe(true);
        });

      it('returns correct filters for just additionalFilter',
        function () {
          result = method(requestedType, pageNoFilter, undefined,
            additionalFilter)[0];

          expect(checkOps(result.filters.expression, ['~'])).toBe(true);
        });

      it('returns correct filters for just text filter and relevant object',
        function () {
          result = method(requestedType, pageWithFilter, relevant,
            undefined)[0];

          expect(checkOps(result.filters.expression,
            ['=', 'AND', 'relevant'])).toBe(true);
        });

      it('returns correct filters for just text filter and additionalFilter',
        function () {
          result = method(requestedType, pageWithFilter, undefined,
            additionalFilter)[0];

          expect(checkOps(result.filters.expression,
            ['=', 'AND', '~'])).toBe(true);
        });

      it('returns correct filters for just relevant object and ' +
         'additionalFilter',
      function () {
        result = method(requestedType, pageNoFilter, relevant,
          additionalFilter)[0];

        expect(checkOps(result.filters.expression,
          ['relevant', 'AND', '~'])).toBe(true);
      });

      it('returns correct filters for text filter, relevant object and ' +
         'additionalFilter',
      function () {
        result = method(requestedType, pageWithFilter, relevant,
          additionalFilter)[0];

        expect(checkOps(result.filters.expression,
          ['=', 'AND', 'relevant', 'AND', '~'])).toBe(true);
      });
    });
  });

  describe('batchRequests() method', function () {
    let batchRequests = QueryAPI.batchRequests;

    beforeEach(function () {
      spyOn(can, 'ajax')
        .and.returnValues(
          can.Deferred().resolve([1, 2, 3, 4]), can.Deferred().resolve([1]));
    });

    afterEach(function () {
      can.ajax.calls.reset();
    });

    it('does only one ajax call for a group of consecutive calls',
      function (done) {
        $.when(batchRequests(1),
          batchRequests(2),
          batchRequests(3),
          batchRequests(4)).then(function () {
          expect(can.ajax.calls.count()).toEqual(1);
          done();
        });
      });

    it('does several ajax calls for delays cals', function (done) {
      batchRequests(1);
      batchRequests(2);
      batchRequests(3);
      batchRequests(4);

      // Make a request with a delay
      setTimeout(function () {
        batchRequests(4).then(function () {
          expect(can.ajax.calls.count()).toEqual(2);
          done();
        });
      }, 150);
    });
  });

  describe('buildCountParams() method', function () {
    let relevant = {
      type: 'Audit',
      id: '555',
      operation: 'relevant',
    };

    it('empty arguments. buildCountParams should return empty array',
      function () {
        let queries = QueryAPI.buildCountParams();
        expect(Array.isArray(queries)).toBe(true);
        expect(queries.length).toEqual(0);
      }
    );

    it('No relevant. buildCountParams should return array of queries',
      function () {
        let types = ['Assessment', 'Control'];

        let queries = QueryAPI.buildCountParams(types);
        let query = queries[0];

        expect(queries.length).toEqual(types.length);
        expect(query.object_name).toEqual(types[0]);
        expect(query.type).toEqual('count');
        expect(query.filters).toBe(undefined);
      }
    );

    it('Pass relevant. buildCountParams should return array of queries',
      function () {
        let types = ['Assessment', 'Control'];

        let queries = QueryAPI.buildCountParams(types, relevant);
        let query = queries[0];
        let expression = query.filters.expression;

        expect(queries.length).toEqual(types.length);
        expect(query.object_name).toEqual(types[0]);
        expect(query.type).toEqual('count');
        expect(expression.object_name).toEqual(relevant.type);
        expect(expression.ids[0]).toEqual(relevant.id);
        expect(expression.op.name).toEqual('relevant');
      }
    );
  });
});
