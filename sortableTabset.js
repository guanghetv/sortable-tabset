/**
 * Created by solomon on 15/2/7.
 */


// Custom made ui-bootstrap tabset directive to extend sortable ability.
angular.module('ui.bootstrap.tabs.sortable', ["custom/template/tabs/tabset.html","custom/template/tabs/tab.html","custom/template/tabs/tabset-titles.html"])

    .controller('TabsetController', ['$scope', function TabsetCtrl($scope) {
        var ctrl = this,
            tabs = ctrl.tabs = $scope.tabs = [];

        ctrl.select = function (tab) {
            angular.forEach(tabs, function (tab) {
                tab.active = false;
            });
            tab.active = true;
        };

        ctrl.addTab = function addTab(tab) {
            tabs.push(tab);
            if (tabs.length === 1 || tab.active) {
                ctrl.select(tab);
            }
        };

        ctrl.removeTab = function removeTab(tab) {
            var index = tabs.indexOf(tab);
            //Select a new tab if the tab to be removed is selected
            if (tab.active && tabs.length > 1) {
                //If this is the last tab, select the previous tab. else, the next tab.
                var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
                ctrl.select(tabs[newActiveIndex]);
            }
            tabs.splice(index, 1);
        };
    }])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 */
    .directive('sortableTabset', function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                sortableOptions: '=',
                model: '='
            },
            controller: 'TabsetController',
            templateUrl: 'custom/template/tabs/tabset.html',
            link: function (scope, element, attrs) {
                scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
                scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
                scope.type = angular.isDefined(attrs.type) ? scope.$parent.$eval(attrs.type) : 'tabs';
            }
        };
    })

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 */
    .directive('sortableTab', ['$parse', function($parse) {
        return {
            require: '^sortableTabset',
            restrict: 'EA',
            replace: true,
            templateUrl: 'custom/template/tabs/tab.html',
            transclude: true,
            scope: {
                heading: '@',
                onSelect: '&select', //This callback is called in contentHeadingTransclude
                //once it inserts the tab's content into the dom
                onDeselect: '&deselect'
            },
            controller: function() {
                //Empty controller so other directives can require being 'under' a tab
            },
            compile: function(elm, attrs, transclude) {
                return function postLink(scope, elm, attrs, tabsetCtrl) {
                    var getActive, setActive;
                    if (attrs.active) {
                        getActive = $parse(attrs.active);
                        setActive = getActive.assign;
                        scope.$parent.$watch(getActive, function updateActive(value, oldVal) {
                            // Avoid re-initializing scope.active as it is already initialized
                            // below. (watcher is called async during init with value ===
                            // oldVal)
                            if (value !== oldVal) {
                                scope.active = !!value;
                            }
                        });
                        scope.active = getActive(scope.$parent);
                    } else {
                        setActive = getActive = angular.noop;
                    }

                    scope.$watch('active', function(active) {
                        // Note this watcher also initializes and assigns scope.active to the
                        // attrs.active expression.
                        setActive(scope.$parent, active);
                        if (active) {
                            tabsetCtrl.select(scope);
                            scope.onSelect();
                        } else {
                            scope.onDeselect();
                        }
                    });

                    scope.disabled = false;
                    if ( attrs.disabled ) {
                        scope.$parent.$watch($parse(attrs.disabled), function(value) {
                            scope.disabled = !! value;
                        });
                    }

                    scope.select = function() {
                        if ( ! scope.disabled ) {
                            scope.active = true;
                        }
                    };

                    tabsetCtrl.addTab(scope);
                    scope.$on('$destroy', function() {
                        tabsetCtrl.removeTab(scope);
                    });


                    //We need to transclude later, once the content container is ready.
                    //when this link happens, we're inside a tab heading.
                    scope.$transcludeFn = transclude;
                };
            }
        };
    }])

    .directive('sortableTabHeadingTransclude', [function() {
        return {
            restrict: 'A',
            require: '^sortableTab',
            link: function(scope, elm, attrs, tabCtrl) {
                scope.$watch('headingElement', function updateHeadingElement(heading) {
                    if (heading) {
                        elm.html('');
                        elm.append(heading);
                    }
                });
            }
        };
    }])

    .directive('sortableTabContentTransclude', function() {
        return {
            restrict: 'A',
            require: '^sortableTabset',
            link: function(scope, elm, attrs) {
                var tab = scope.$eval(attrs.sortableTabContentTransclude);

                //Now our tab is ready to be transcluded: both the tab heading area
                //and the tab content area are loaded.  Transclude 'em both.
                tab.$transcludeFn(tab.$parent, function(contents) {
                    angular.forEach(contents, function(node) {
                        if (isTabHeading(node)) {
                            //Let tabHeadingTransclude know.
                            tab.headingElement = node;
                        } else {
                            elm.append(node);
                        }
                    });
                });
            }
        };
        function isTabHeading(node) {
            return node.tagName &&  (
                node.hasAttribute('tab-heading') ||
                node.hasAttribute('data-tab-heading') ||
                node.tagName.toLowerCase() === 'tab-heading' ||
                node.tagName.toLowerCase() === 'data-tab-heading'
                );
        }
    })
;

angular.module("custom/template/tabs/tabset.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("custom/template/tabs/tabset.html",
        "\n" +
        "<div class=\"tabbable\">\n" +
        "  <ul ui-sortable=\"sortableOptions\" ng-model=\"model\" class=\"nav {{type && 'nav-' + type}}\" ng-class=\"{'nav-stacked': vertical, 'nav-justified': justified}\" ng-transclude></ul>\n" +
        "  <div class=\"tab-content\">\n" +
        "    <div class=\"tab-pane\" \n" +
        "         ng-repeat=\"tab in tabs\" \n" +
        "         ng-class=\"{active: tab.active}\"\n" +
        "         sortable-tab-content-transclude=\"tab\">\n" +
        "    </div>\n" +
        "  </div>\n" +
        "</div>\n" +
        "");
}]);

angular.module("custom/template/tabs/tab.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("custom/template/tabs/tab.html",
        "<li ng-class=\"{active: active, disabled: disabled}\">\n" +
        "  <a ng-click=\"select()\" sortable-tab-heading-transclude>{{heading}}</a>\n" +
        "</li>\n" +
        "");
}]);

angular.module("custom/template/tabs/tabset-titles.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("custom/template/tabs/tabset-titles.html",
        "<ul class=\"nav {{type && 'nav-' + type}}\" ng-class=\"{'nav-stacked': vertical}\">\n" +
        "</ul>\n" +
        "");
}]);

