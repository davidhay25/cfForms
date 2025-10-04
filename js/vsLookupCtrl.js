/*
* The controller for the VSLookup function.
*
*
* */


angular.module("pocApp")
    .controller('vsLookupCtrl',
        function ($scope,$http,$localStorage,$uibModal,$q,$timeout,querySvc,utilsSvc,$window) {

            $scope.input = {}
            $scope.input.mainTabActive = 1      //just while developing - selects that conceptmap tab

            let vsPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/"

            //allows a valueset to be specified in the call... - the name part of the url - eg canshare-tnm8-breast-cm
            let srch = $window.location.search;
            $scope.inputVs = null
            if (srch) {
                $scope.inputVs = `${vsPrefix}${srch.substr(1)}`
            }

            $scope.localStorage = $localStorage

            //$scope.loadingCM = false

            $scope.version = utilsSvc.getVersion()

            $scope.input.tsInstance = "authoring"

            $scope.languages = []       //languages that can be used for the expansion
            $scope.languages.push({display:"Default",code:""})
            $scope.languages.push({display:"CanShare",code:"en-x-sctlang-23162100-0210105"})
            $scope.input.selectedLanguage = $scope.languages[1]     //default to canshare



            let nzDisplayLanguage = "en-x-sctlang-23162100-0210105"

            let termServer = "https://r4.ontoserver.csiro.au/fhir/"
            let snomed = "http://snomed.info/sct"



            // =============================================== functions to support ConceptMap work =================

            $scope.input.cmOptions = {}         //options by property

            $scope.input.excludeHL7 = true
            $scope.input.onlyCanShare = true
            $scope.input.loadComplete = true


            //display the tree view of a ConceptMap



            //whether to show a particular VS
            $scope.showVS = function (item) {

                if (! $scope.input.includeRetired) {
                    if (item.vs.status == 'retired' || item.vs.status == 'draft') {
                        return false
                    }
                }


                let filter = $scope.input.filterlist
                if (filter) {
                    let match = item.display.toLowerCase().indexOf(filter.toLowerCase()) > -1 || item.vs.url.toLowerCase().indexOf(filter.toLowerCase()) > -1


                    if (match ) {
                        return true
                    } else {
                        return false
                    }
                } else {
                    return true
                }

            }

            $scope.lookup = function (code,system) {
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


            // ========================== end of conceptmap functions ====================

/*
            $scope.adhocQuery = function (qry) {
                delete $scope.adhocResult
                delete $scope.adhocError
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true

                let config = {headers:{'x-ts-instance':$scope.input.tsInstance}}

                $http.get(`nzhts?qry=${encodedQry}`,config).then(
                    function (data) {
                        $scope.adhocResult = data.data

                    }, function (err) {
                        $scope.adhocError = err
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            $scope.selectAdhoc = function (resource) {
                $scope.selectedAdhocResource = resource
            }
$scope.addCanshareIdent = function (type){
                $scope.input.adHocQuery = $scope.input.adHocQuery || ""
                $scope.input.adHocQuery += `?identifier=http://canshare.co.nz/fhir/NamingSystem/${type}%7c&_summary=false`
            }

            */



            //get the canshare valuesets from the TS
            $scope.showLoadingMessage = true


            //-------------  select a specific instance of the Terminology server
            $scope.changeInstance = function (tsInstance) {
                delete $scope.allVSItem
                delete $scope.selectedVS
                delete $scope.expansionError

                //$scope.showWaiting = true
                querySvc.getValueSets(tsInstance).then(
                    function (ar) {
                        $scope.allVSItem = ar

                        delete $scope.showLoadingMessage


                        //If a vsUrl was passed in, see if it is in the list of items, and if so select it...


                        if ($scope.inputVs) {

                            let ar = $scope.allVSItem.filter(item => item.vs.url == $scope.inputVs)
                            if (ar.length > 0) {
                                $scope.input.filterlist = $scope.inputVs
                                //$scope.showVS()
                                $scope.input.mainTabActive = 0
                                $scope.selectVSItem(ar[0])



                            }


                        }





                    }
                )
            }

            //this is the initial load.
            $scope.changeInstance($scope.input.tsInstance)

            //expand a ValueSet
            $scope.expandVSInTS = function (vs) {
                delete $scope.expandedVS
                delete $scope.expansionError

                let qry = `ValueSet/$expand?url=${vs.url}&_summary=false`

                if ($scope.input.selectedLanguage && $scope.input.selectedLanguage.code) {
                    qry += `&displayLanguage=${$scope.input.selectedLanguage.code} `
                }
                if ($scope.input.filter) {
                    qry += `&filter=${$scope.input.filter}`
                }

                $scope.expandQry = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true


                let config = {headers:{'x-ts-instance':$scope.input.tsInstance}}

                $http.get(`nzhts?qry=${encodedQry}`,config).then(
                    function (data) {
                        $scope.expandedVS = data.data
                    }, function (err) {
                        $scope.expansionError = err
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            //when a VS is selected in the UI
            $scope.selectVSItem = function (item) {
                //retrieve the complete VS. we know the id, but we'll still search by url as that's the recommended
                // way to do it, and we want to show the url to the user...
                $scope.selectedItem = item
                delete $scope.expandedVS
                delete $scope.selectedVS
                delete $scope.expandQry
                //delete $scope.qUsingVS
                delete $scope.dummyQR
                delete $scope.expansionError
                delete $scope.input.filter


                let qry = `ValueSet?url=${item.vs.url}&_summary=false`
                let config = {headers:{'x-ts-instance':$scope.input.tsInstance}}



                $scope.termServerQuery = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`,config).then(
                    function (data) {
                       // $scope.selectedVS = data.data

                        //it's a query so a bundle is expected
                        if (data.data && data.data.entry) {
                            if (data.data.entry.length !== 1) {
                                alert(`There were ${data.data.entry.length} matching ValueSets. This is very likely an issue with duplicated resources on the terminology server`)
                            } else {
                                $scope.selectedVS = data.data.entry[0].resource
                                $scope.expandVSInTS($scope.selectedVS)  //perform the expansion
                            }
                        } else {
                            alert("The ValueSet was not found")
                        }


                    }, function (err) {
                        console.log(err)
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            $scope.selectVS = function (vs) {
                $scope.selectedVS = vs
                delete $scope.vsExpanded
                delete $scope.ooExpand
            }


            $scope.expandVS = function (vs,filter) {
                delete $scope.ooExpand
                let qry = `${$scope.selectedServer.url}ValueSet/${vs.id}/$expand`
                if (filter) {
                    qry += `?filter=${filter}`
                }
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`termQuery?qry=${encodedQry}`).then(
                    function (data) {

                        $scope.vsExpanded = data.data    //a bundle containing all the DR versions
                    }, function (err) {
                        $scope.ooExpand = err.data
                    }).then(function () {
                        $scope.showWaiting = false
                    }
                )
            }


            $scope.copyObjectToClipboardDEP = function(obj) {
                let text = angular.toJson(obj,true)
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(function() {
                        alert('Copied to clipboard successfully!');
                    }, function(err) {
                        alert('Failed to copy: ', err);
                    });
                }

                return


                let textArea = document.createElement("textarea");
                textArea.value = text;

                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    let successful = document.execCommand('copy');
                    let msg = successful ? 'successful' : 'unsuccessful';
                    console.log('Fallback: Copying text command was ' + msg);
                } catch (err) {
                    alert('Fallback: Oops, unable to copy', err);
                }

                document.body.removeChild(textArea);
            }




        }
    )