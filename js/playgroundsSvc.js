angular.module("pocApp")

    .service('playgroundsSvc', function($http,utilsSvc,$q) {

        return {

            getVersions : function (pgId) {
                let deferred = $q.defer()
                let qry = `/playgroundVersion/${pgId}`
                $http.get(qry).then(
                    function (data) {
                        deferred.resolve(data.data)
                    }, function (err) {
                        deferred.reject(err)
                    }
                )

                return deferred.promise

            },

            saveAsVersion : function (pg) {
                //Inflate the playground and save as a version
                let deferred = $q.defer()

                //todo - inflate all the contained DG's for container DG's
                //only these will be in the version

                //post the playground to the version API. It will be rejected is there are duplicate versions
                $http.post(`playgroundVersion`,pg).then(
                    function (data) {
                        deferred.resolve()
                    }, function (err) {
                        deferred.reject(err)

                        //alert(angular.toJson(err.data))
                    }
                )

                return deferred.promise

            },

            currentPlaygroundDiff : function (currentPG, initialPG) {
                //look for diffs between the pg (which is the current PG) and initialPG (which was originally loaded)
                //for now, a simple json based comparison of DGs - later could be a more detailed diff
                if (! initialPG || ! initialPG.dataGroups || ! currentPG) {
                    return {}
                }




                let response = {}    //dgnames that are different
                let hashInitialDGs = {}     //hash by name of DGs in the initial load
                //create a hash of all DGs in the initial load
                for (const key of Object.keys(initialPG.dataGroups)) {
                    hashInitialDGs[key] = simpleHash(angular.toJson(initialPG.dataGroups[key]))
                }
/*
                //look for new DGs
                for (const key of Object.keys(currentPG.dataGroups)) {
                    if (! hashInitialDGs[key]) {
                        response[key] = [{msg:"This is a new DG"}]
                    }
                }
*/
                //for (const dg of pg.dataGroups) {
                for (const key of Object.keys(currentPG.dataGroups)) {
                    if (hashInitialDGs[key]) {
                        //the DG is still there, has it changed?
                        let initialHash = hashInitialDGs[key]
                        let currentHash = simpleHash(angular.toJson(currentPG.dataGroups[key]))

                        //currentHash = angular.toJson(currentPG.dataGroups[key])
                        //initialHash = angular.toJson(initialPG.dataGroups[key])

                        if (initialHash !== currentHash) {
                            response[key] = [{type:"changed",msg:"DG was changed"}]
                        }

                    } else {
                        //the DG was deleted
                        response[key] = [{type:"added",msg:"DG was added"}]
                    }

                }

                //look for deleted DGs
                for (const key of Object.keys(initialPG.dataGroups)) {
                    if (! currentPG.dataGroups[key]) {
                        response[key] = [{type:"deleted",msg:"This is a deleted DG"}]
                    }
                }

                return response


                function simpleHash(str) {
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) {
                        const chr = str.charCodeAt(i);
                        hash = (hash << 5) - hash + chr; // same as hash * 31 + chr
                        hash |= 0; // Convert to 32-bit integer
                    }
                    return hash;
                }


            },

            savePlaygroundDEP : function (pg,email) {
                let deferred = $q.defer()
                $http.get(`playground/${$localStorage.world.id}`).then(


                )

                return deferred.promise

            },

            getImportableDG: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the library
                //These are DG's that have been exported as 'frozen'
                //re-named as 'componnets
                let arImport = []
                $http.get('allfrozen').then(
                    function (data) {

                        for (const dg of data.data) {
                            if (hashAllDG[dg.name]) {
                                dg.nameExists = true
                            }

                            arImport.push(dg)
                        }

                        arImport.sort(function (a,b) {
                            if (a.title > b.title) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        deferred.resolve(arImport)

                    }, function (err) {
                        //at least retun the simple ones
                        deferred.reject(err)
                    }
                )

                return deferred.promise


            },

                getImportableDGDEP: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the library
                //right now, it's those that have no parents and only FHIR datatype elements

                let hash = {}

                let fhirDT = utilsSvc.fhirDataTypes()
                let arImport = []

                let qry = `/model/allDG`
                    $http.get(qry).then(
                    function (data) {
                        let libraryDG = data.data
                        for (const dg of libraryDG) {
                            if (! dg.parent && dg.diff) {
                                let canImport = true
                                for (const ed of dg.diff) {
                                    let type = ed.type[0]
                                    if (fhirDT.indexOf(type) == -1) {
                                        canImport = false
                                        break
                                    }
                                }
                                if (canImport) {
                                    //there are some values and this DG name not already in use
                                    if (dg.diff.length > 0 && ! hashAllDG[dg.name]) {
                                        hash[dg.name] == true
                                        arImport.push(dg)
                                    }

                                }

                            }
                        }


                        //now get the frozen DGs
                        $http.get('allfrozen').then(
                            function (data) {
                                data.data.forEach(function (dg) {
                                    //can import if not already marked for import & the name is not already used...
                                    if (! hash[dg.name] && ! hashAllDG[dg.name]) {
                                        arImport.push(dg)
                                    }


                                })
                                deferred.resolve(arImport)

                            }, function (err) {
                                //at least retun the simple ones
                                deferred.resolve(arImport)
                            }
                        )




                    }, function (err) {
                        console.error(angular.toJson(err.data))
                            deferred.reject(angular.toJson(err.data))
                    })

                return deferred.promise

            }
        }}
    )