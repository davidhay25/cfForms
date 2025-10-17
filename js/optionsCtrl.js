//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('optionsCtrl',
        function ($scope,ed,readOnly,$http,$uibModal) {

            $scope.input = {}
            $scope.ed = ed
            $scope.readOnly = readOnly

            //there are already options - add them to the textarea so it can be edited
            if (ed.options) {
                let txt = ""
                ed.options.forEach(function (opt) {
                    txt += opt.display + "\n"
                })

                $scope.input.optionsList = txt
            }

            //codesystem lookup functions
            $scope.lookup = function (code,system) {

                //can also pass in code|system as the code (from terminlogy report)
                let ar = code.split('|')
                if (ar.length > 1) {
                    code = ar[0]
                    system = ar[1]
                }


                system = system || snomed
                let qry = `CodeSystem/$lookup?system=${system}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            //backdrop: 'static',
                            //size : 'lg',
                            controller : "showParametersCtrl",
                            resolve: {
                                parameters: function () {
                                    return data.data
                                },
                                title : function () {
                                    return `Concept lookup (${code})`
                                },
                                code: function () {
                                    return code
                                },
                                system : function () {
                                    return system
                                }
                            }
                        })

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })
            }

            $scope.parseList = function (txt) {
                $scope.ed.options = []
                console.log(txt)
                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let option = {}
                    option.pt = lne
                    option.code = lne
                    option.display = lne
                    $scope.ed.options.push(option)

                })
                $scope.input.dirty = true
            }


            $scope.parseSnomed = function (txt) {
                $scope.ed.options = []
                console.log(txt)
                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let ar = lne.split('\t')
                    //console.log(ar)
                    let option = {}
                    option.code = ar[0]
                    option.pt = ar[1]       //set the pt (preferred term) and the display the same. Not sure if we should be using pt anyway...
                    option.display = ar[1]
                    if (ar.length > 2) {
                        option.fsn = ar[2]
                    }

                    $scope.ed.options.push(option)

                })
                $scope.input.dirty = true
                //console.log(ar)
            }


            $scope.save = function () {
                $scope.$close($scope.ed)
            }

    })