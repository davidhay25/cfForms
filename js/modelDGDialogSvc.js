angular.module("pocApp")

    .service('modelDGDialogSvc', function() {

        return {

            getControlType: function (ed) {
                if (ed) {
                    let controlType = "input"
                    if (ed.options) {
                        controlType = 'dropdown'
                    }

                    let type = ed.type[0]
                    if ($scope.hashAllDG[type] && $scope.hashAllDG[type].diff) {
                        controlType = "dg"
                    }

                    console.log(controlType)
                    return controlType
                }
            }
        }

    })