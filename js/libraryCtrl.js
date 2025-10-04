//seversync is actually the main library interface
angular.module("pocApp")
    .controller('libraryCtrl',
        function ($scope,$rootScope,$http,allDG,allComp,$sce,allQObject,user,userMode,snapshotSvc,
                  utilsSvc,librarySvc,$timeout,$uibModal,$window,playgroundsSvc,modelsSvc) {

            $scope.input = {}
            $scope.input.showForm = true
            $scope.user = user
            $scope.userMode = userMode

            $scope.canBulkUpdateDGLibrary = function () {
                //a function to copy all the DG to the libraray. Only for me running locally.
                //for use after importing a json file.
                if (! user) {return false}
                if (user.email == 'david.hay25@gmail.com' && $window.location.hostname == 'localhost') {
                    return true
                }
            }

            $scope.loadAllQNames = function () {
                $http.get('Questionnaire/getSummary').then(
                    function (data) {
                        $scope.lstQ = data.data.lstQ
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            $scope.loadAllQNames()
            $scope.loadQ = function (qName) {
                const url = `modelReview.html?q-${qName}`
                const features = 'noopener,noreferrer'
                window.open(url, '_blank', features)
            }

            $scope.canShowComponent = function (dg) {
                if (! dg.source) {
                    return true
                }

                if (dg.source == 'playground' && $scope.input.showForm) {
                    return true
                }
                if (dg.source == 'library' && $scope.input.showLibrary) {
                    return true
                }

            }

            $scope.deleteComponent = function (dg) {
                if (confirm(`Are you sure you wish to delete the component: ${dg.name}`)) {
                    dg.deleted = true
                    $http.put(`frozen/${dg.name}`,dg).then(
                        function () {
                            alert("Component has been removed (It's still there, but hidden ")
                            playgroundsSvc.getImportableDG(allDG).then(
                                function (data) {
                                    $scope.components = data
                                }
                            )
                        }, function (err) {
                            alert("There was an error deleting the component:" + angular.toJson(err.data))
                        }

                    )
                }
            }


            $scope.selectFromComponent = function (dg) {
                let clone = angular.copy(dg)    //to make sure we don't inadvertantly update the DG
                //let fullElementList = snapshotSvc.getFullListOfElements(clone.name)// vo.allElements
                let elementList = [{ed:{path:clone.name,title:clone.name}}]

                //while preparing the element list, check for dups
                let hashId = {}
                $scope.dups = {}
                $scope.dupsCount = 0

                for (const ed of clone.diff) {
                    if (hashId[ed.id]) {
                        $scope.dupsCount++
                        $scope.dups[ed.id] = true   //record the duplicate for the fix
                    }
                    hashId[ed.id] = true
                    ed.path = `${dg.name}.${ed.path}`
                    elementList.push({ed:ed})
                }

                $scope.clone = clone        //just for the UI
                let treeData = modelsSvc.makeTreeFromElementList(elementList)
                $('#componentTree').jstree('destroy');
                $('#componentTree').jstree(
                    {'core':
                            {'multiple': false,
                                'data': treeData,
                                'themes': {name: 'proton', responsive: true}}
                    }
                ).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node", id);
                    //let treeObject = $(this).jstree(true).get_json('#', { 'flat': false })


                })
            }


            $scope.fixIds = function () {
                //assign new ids for any duplicates.

            }

            $scope.close = function () {
                $scope.$close()
            }

            playgroundsSvc.getImportableDG(allDG).then(
                function (data) {
                    $scope.components = data
                }
            )

            $scope.importComponent = function (dg) {

                librarySvc.checkIds(dg)     //check all id's present and unique


                let name = dg.name
                let newName = prompt("What is the name for the imported DG (No spaces)",name)
                if (newName) {
                    dg.name = newName.replace(/\s/g, '')    //remove any spaces
                    $scope.$close({dg:dg})
                }



            }

            function loadNamedQueries() {
                let qry = "model/namedquery"
                $http.get(qry).then(
                    function (data) {
                        $scope.namedQueries = data.data
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }
            loadNamedQueries()

            $scope.updateNamedQuery = function (name,itemName,description,contents,active) {

                if (! active) {
                    if (! confirm("Are you sure you wish to remove this Named Query?")) {
                        return
                    }
                } else {
                    for (const nq1 of $scope.namedQueries) {
                        if (name == nq1.name) {
                            alert("This is a duplicate name. You need to choose another.")
                            return
                            break
                        }
                    }
                }

                let qry = `/model/namedquery/${name}`
                let nq = {name:name,itemName:itemName,description:description,contents:contents,active:active}

                $http.put(qry,nq).then(
                    function (data) {
                        $scope.namedQueries = data.data
                        delete $scope.input.nqName
                        delete $scope.input.nqItemName
                        delete $scope.input.nqDescription
                        delete $scope.input.nqContents
                        loadNamedQueries()
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }


            $scope.testxquery = function (xqry) {
                //xqry = {name: itemName: description: contents}
                $uibModal.open({
                    size : 'xlg',
                    backdrop: 'static',
                    templateUrl: 'modalTemplates/xquery.html',
                    controller: 'xqueryCtrl',


                    resolve: {
                        query: function () {
                            return xqry
                        }
                    }
                }).result.then(
                    function (vo) {
                       // alert(vo.expression)

                        xqry.contents = vo.expression

                        let qry = `/model/namedquery/${name}`
                        //let nq = {name:name,itemName:itemName,description:description,contents:contents,active:active}

                        $http.put(qry,xqry).then(
                            function (data) {
                                //$scope.namedQueries = data.data

                                for (qry of $scope.namedQueries) {
                                    if (qry.name == xqry.name) {
                                        qry.contents = vo.expression
                                        break
                                    }
                                }




                               // loadNamedQueries()
                            }, function (err) {
                                alert(angular.toJson(err.data))
                            }
                        )


/*
                        $scope.updateNamedQuery (xqry.name,xqry.itemName,xqry.description,vo.expression,true)

                        for (qry of $scope.namedQueries) {
                            if (qry.name == xqry.name) {
                                qry.contents = vo.expression
                                break
                            }
                        }
                        */
                    }
                )
            }

            $scope.input.filter = {}

            $scope.localDGCount = Object.keys(allDG).length

            $scope.clearFilter = function () {
                $scope.input.filter = {}
            }

            //create a playground in the Models repository
            $scope.createPlayground = function (name,description) {
                if (confirm(`Are you sure you wish to create a playground in the Models Repository named ${name}`)) {
                    $http.get(`playgroundByName/${name}`).then(
                        function (data) {
                            alert("Sorry, there is already a playground with this name")
                        }, function (err) {
                            if (err.status == 404) {

                                let pg = {name:name,description:description}
                                pg.id = utilsSvc.getUUID()
                                pg.dataGroups = {}
                                pg.compositions = {}
                                pg.updated = new Date()

                                for (const dg of $scope.libraryDG) {
                                    pg.dataGroups[dg.name] = dg
                                }
                                for (const comp of $scope.libraryComp) {
                                    pg.compositions[comp.name] = comp
                                }

                                if (user) {
                                    pg.email = user.email
                                }


                                console.log(pg)

                                $http.put(`playground/${pg.id}`,pg).then(
                                    function (data) {
                                        let msg = "The playground has been created."
                                        alert(msg)
                                    }, function (err) {
                                        alert(angular.toJson(err.data))
                                    }
                                )



                            } else {
                                alert(angular.toJson(err))
                            }

                        })
                }


            }


            //whether a composition is shown.
            //if there are filters set, then all must match for either library or local com
            $scope.showComp = function (item) {
                //let show = true

                //if there's no filter then return true
                if (Object.keys($scope.input.filter).length == 0) {
                    return true
                }

                if (item.library && checkMeta(item.library)) {
                    return true
                }
                if (item.local && checkMeta(item.local)) {
                    return true
                }


                //return show

                function checkMeta(comp) {
                    if (! comp.meta) {
                        return false
                    }

                    let show = true
                    Object.keys($scope.input.filter).forEach(function (key) {
                        let value = $scope.input.filter[key]
                        if (value) {
                            //there's a value, then the value from meta must match
                            if (! comp.meta[key] || comp.meta[key] !== value) {
                                show = false
                            }
                        }
                    })
                    return show

                }
            }

            let trusted = {}; //https://stackoverflow.com/questions/33297444/uib-popover-html-wont-accept-my-html-string
            $scope.getPopoverHtmlDEP = function(obj) {
                //works, but I don't want to use it here. Leaving so I know how to do it later on
                //let content = "<bold>Test</bold>"
                let content = `<pre>${angular.toJson(obj,true)}</pre>`
                return trusted[content] || (trusted[content] = $sce.trustAsHtml(content));
            }

            //get all the DG
            $scope.refreshDGSummary = function (includeDeleted) {
                let qry = `/model/allDG`
                if (includeDeleted){
                    qry += "?includeDeleted=true"
                }

                $http.get(qry).then(
                    function (data) {
                        $scope.libraryDG = data.data
                        $scope.libraryDGCount = $scope.libraryDG.length
                        //console.log($scope.libraryDG)
                        makeDGSummary(allDG,$scope.libraryDG)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    })
            }
            $scope.refreshDGSummary()


            $scope.refreshCompSummary = function (includeDeleted) {
                //get all the compositions
                let qryComp = `/model/allCompositions`
                if (includeDeleted){
                    qryComp += "?includeDeleted=true"
                }

                $http.get(qryComp).then(
                    function (data) {
                        $scope.libraryComp = data.data
                        $scope.libraryCompCount = $scope.libraryComp.length
                        //console.log($scope.libraryComp)
                        //allComp are the compositions in the currents users browser cache
                        makeCompSummary(allComp,$scope.libraryComp)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    })
            }
            $scope.refreshCompSummary()
            
            $scope.updateRepo = function () {
                if (confirm("This will update all DGs in the Library with the loacal ones. Are you sure you wish to do this?")) {

                    Object.keys(allDG).forEach(function (key) {
                        let localDG = allDG[key]

                        librarySvc.checkIn(localDG,user)

                    })

                    alert("Update complete.")
                    $scope.$close()

                }
            }


            //local comp and library comp
            function makeCompSummary(allComp,libraryComp) {
                let libraryHash = {}

                $scope.hashMetaProperties = {}     //all metadata properties and their values

                libraryComp.forEach(function (comp) {
                    libraryHash[comp.name] = comp
                    updateMetaValues(comp)              //update all the possible metadata values for library compositions
                })

                $scope.summaryComp = []        //the summary compositions array {name: title: local: library: note

                Object.keys(allComp).forEach(function (key) {
                    let localComp = allComp[key]
                    updateMetaValues(localComp)              //update all the possible metadata values for local compositions
                    let item = {name:key,title:localComp.title,local:localComp}
                    if (libraryHash[key]) {
                        item.library = libraryHash[key]
                        delete libraryHash[key]      //any left in the hash at the end are new on the library
                    } else {
                        item.note = "Not in Library"
                    }

                    $scope.summaryComp.push(item)
                })

                //Any Comp left in the serverHash are new on the server
                Object.keys(libraryHash).forEach(function (key) {
                    let libraryComp = libraryHash[key]
                    let item = {name:key, title:libraryComp.title, library:libraryComp,note:"Library only"}
                    $scope.summaryComp.push(item)
                })

                $scope.summaryComp.sort(function (a,b) {
                    if (a.title.toLowerCase() > b.title.toLowerCase()) {
                        return 1
                    } else {
                        return -1
                    }

                })

                console.log($scope.hashMetaProperties)

                //update the list of meta items and their possible values for the filtered view
                function updateMetaValues(comp) {
                    if (comp.meta) {
                        Object.keys(comp.meta).forEach(function (key) {
                            $scope.hashMetaProperties[key] = $scope.hashMetaProperties[key] || []

                            let v = comp.meta[key]
                            if ($scope.hashMetaProperties[key].indexOf(v) == -1) {
                                $scope.hashMetaProperties[key].push(v)
                            }


                        })
                    }

                }

            }

            //create the summary between library DG & local DG
            function makeDGSummary(allDG,libraryDG) {
                let libraryHash = {}

                libraryDG.forEach(function (dg) {
                    libraryHash[dg.name] = dg
                })

                $scope.summary = []        //the summary array
                Object.keys(allDG).forEach(function (key) {
                    let localDG = allDG[key]
                    let item = {name:key,title:localDG.title,local:localDG}
                    if (libraryHash[key]) {
                        item.library = libraryHash[key]

                        //The library checkedout status is the source of truth. This may not update allDG - but that will be updated when the DG is selected
                        item.local.checkedOut = item.library.checkedOut

                        delete libraryHash[key]      //any left in the hash at the end are new on the library

                    } else {
                        item.note = "Not in Library"
                        //the library  doesn't have this DG
                    }

                    /* - now always setting local checkout to the library
                    //checkout checks
                    if (item.local && item.local.checkedOut) {
                        if (! item.library) {
                            //The local version is checked out, but there is no library version.
                            item.note = `WARNING: Local is checked out to ${item.local.checkedOut}, but there is no Library version`
                        } else {
                            //The local version is checked out, but the library version is either not checked out, or chacked out to someone else
                            if (item.library.checkedOut !== item.local.checkedOut) {
                                item.note = `WARNING: Local is checked out to ${item.local.checkedOut}, but Library checkout is ${item.library.checkedOut}`
                            }
                        }
                    }

                    if (item.library && item.library.checkedOut) {
                        //The DG is checked out in the library, but the local version is checked out to someone else
                        //There's a local copy with a checkout which is different to the library
                        if (item.local && item.local.checkedOut && item.local.checkedOut !== item.library.checkedOut) {
                            item.note = `WARNING: Local is checked out to ${item.local.checkedOut}, but Library checkout is ${item.library.checkedOut}`
                        }
                    }

*/


                    /*
                    if (item.library && item.local && item.library.checkedOut !== item.local.checkedOut) {
                        item.note = "WARNING: Local and Library have different checked out emails"
                    }
                    */


                    $scope.summary.push(item)
                })

                //Any DG left in the serverHash are new on the server
                Object.keys(libraryHash).forEach(function (key) {
                    let libraryDG = libraryHash[key]
                    let item = {name:key, title:libraryDG.title, library:libraryDG,note:"Library only"}
                    $scope.summary.push(item)
                })

                try {
                    $scope.summary.sort(function (a,b) {
                        if (a.title.toLowerCase() > b.title.toLowerCase()) {
                            return 1
                        } else {
                            return -1
                        }
                    })
                } catch (ex) {
                    console.log("Issue sorting DG - likely a missing title",ex)
                }



            }

            $scope.downloadComp = function(comp) {
                //set the comp property of the vo and exit. The caller (modelsCtrl.js) will update
                //this is now an array of comp to support multiple comps being downloadad
                $scope.$close({comp:[comp]})
            }

            $scope.downloadDisplayedComp = function () {
                // download all of the compositions displayed (that aren't already present locally and checked out)
                let arDownload = []     //array of compositions to download
                for (const item of $scope.summaryComp) {
                    if ($scope.showComp(item)) {
                        if (item.library  ) {

                            //the comp is in the library. Add to the download unless it is present locally
                            //and checked out to the current user. ie overwrite locals not checked out to the current user
                            if (item.local && item.local.checkedOut == user.email) {
                                //do nothing
                            } else {
                                arDownload.push(item.library)
                            }

                        }
                    }
                }
                console.log(arDownload)
                if (arDownload.length == 0) {
                    alert("All displayed Compositions are currently in your Local store")
                    return
                }

                let msg = `There are ${arDownload.length} compositions not checked out to you that will be downloaded. Confirm you want this to happen.`

                if (confirm(msg)) {
                    $scope.$close({comp:arDownload})
                }

            }


            $scope.downloadDG = function(dg) {
                //set the comp property of the vo and exit. The caller (modelsCtrl.js) will update
                //todo - should the library version be undeleted as well?
                if (dg.active !== undefined && ! dg.active) {
                    alert("The DG has been downloaded. It is still deleted in the Library.")
                    dg.active=true
                }

                $scope.$close({dg:dg})

            }

            //delete a library item
            $scope.deleteDG = function (dg) {

                if (dg.checkedOut) {
                    alert(`DG is checked out to ${dg.checkedOut} and must be checked in by them prior to deletion`)
                    return
                }

                if (confirm(`Are you sure you wish to remove the ${dg.title} DG from the library AND the local store. It will mark it as inactive in the library, and remove it from the local store. `)) {

                    let url = `/model/DG/${dg.name}/delete`
                    let config = {headers:{'x-user-email': user.email}}

                    $http.put(url,dg,config).then(
                        function (data) {
                            delete allDG[dg.name]       //remove locally
                            $timeout(function(){
                                $rootScope.$broadcast('updateDGList',{})
                            },500)

                            $scope.refreshDGSummary()  //load all DG from the library and update the local display

                            alert("Resource has marked as inactive in the Library, and deleted locally.")

                        },
                        function (err) {
                            alert(angular.toJson(err))
                        }
                    )

                }
            }

            $scope.deleteComposition = function (comp) {

                if (comp.checkedOut) {
                    alert(`Composition is checked out to ${comp.checkedOut} and must be checked in by them prior to deletion`)
                    return
                }

                if (confirm(`Are you sure you wish to remove the ${comp.title} Composition from the library AND the local store. It will mark it as inactive in the library, and remove it from the local store. `)) {

                    let url = `/model/comp/${comp.name}/delete`
                    let config = {headers:{'x-user-email': user.email}}

                    $http.put(url,comp,config).then(
                        function (data) {
                            delete allComp[comp.name]       //remove locally

                            alert("Composition has marked as inactive in the Library, and deleted locally.")
                            $scope.$close()

                        },
                        function (err) {
                            alert(angular.toJson(err))
                        }
                    )

                }


            }

            $scope.refreshFromRepo = function () {
                if (! user) {   //shouldn't happen...
                    alert("No user!")
                    return
                }
                if (confirm(`Are you sure you wish to refresh your local DGs from the Library.`)) {
                    let qry = 'model/allDG'
                    $http.get(qry).then(
                        function (data) {
                            //console.log(data)

                            let arDG = data.data
                            $scope.syncOutcomeDownloadSummary = {details:[],changed:0}
/*
                            //make a copy so we know what was replaced and what is new
                            let existingDGCopy = angular.copy(allDG)

                            //delete all DG's that are not checked out to the current user
                            let ar = Object.keys(allDG)
                            ar.forEach(function (key) {
                                let dg = allDG[key]
                                if (! dg.checkedOut || (dg.checkedOut !== user.email)) {
                                    delete allDG[key]
                                }
                            })
                            //allDG = {}

*/
                            //replace each one. Leaves any that aren't in the library
                            arDG.forEach(function (dg) {
                                if (dg.kind == 'dg') {      //shouldn't need to check, but there's rubbish in the library ATM
                                    let existingDG = allDG[dg.name]
                                    if (existingDG) {
                                        if (angular.toJson(dg) !== angular.toJson(existingDG)) {
                                            //the DG exists on the local systemn and is different
                                            //is the existing one checked out by the current user
                                            if (user && existingDG.checkedOut == user.email) {
                                                //this is checked out to the current user. Don't download
                                                $scope.syncOutcomeDownloadSummary.details.push({msg : `${dg.name} not updated as it is checked out to the current user`})
                                            } else {
                                                //either no user, or the DG is not checked out to them
                                                allDG[dg.name] = dg
                                                $scope.syncOutcomeDownloadSummary.details.push({msg : `${dg.name} updated`})
                                            }
                                        }
                                    } else {
                                        //this is a new DG
                                        allDG[dg.name] = dg
                                        $scope.syncOutcomeDownloadSummary.details.push({msg : `${dg.name} added`})
                                    }
                                }

                            })


                        },
                        function (err) {
                            console.log(err)
                        }
                    )
                }

            }



            $scope.checkAllDGIn = function () {
                //only show if user logged in


                let ctr = 0
                Object.keys(allDG).forEach(function (key) {
                    let DG = allDG[key]
                    if (DG.checkedOut == user.email) {
                        ctr++
                    }
                })

                if (ctr == 0) {
                    alert("There are no DataGroups checked out to you.")
                    return
                }

                if (confirm(`Are you sure you want to check in all ${ctr} DGs checked out to you?`)) {
                    //let lst = []
                    Object.keys(allDG).forEach(function (key) {
                        let DG = allDG[key]
                        if (DG.checkedOut == user.email) {
                           // lst.push(DG)
                            librarySvc.checkIn(DG,user)
                        }
                    })
                   // console.log(lst)
                    alert("Check in complete. It may take a few seconds for all the checkins to be completed.")
                    $scope.$close()




                }

            }

            $scope.checkAllCompIn = function () {
                //only show if user logged in


                let ctr = 0
                Object.keys(allComp).forEach(function (key) {
                    let comp = allComp[key]
                    if (comp.checkedOut == user.email) {
                        ctr++
                    }
                })

                if (ctr == 0) {
                    alert("There are no Compositions checked out to you.")
                    return
                }

                if (confirm(`Are you sure you want to check in all ${ctr} Compositions checked out to you?`)) {
                    //let lst = []
                    Object.keys(allComp).forEach(function (key) {
                        let comp = allComp[key]
                        if (comp.checkedOut == user.email) {
                            // lst.push(DG)
                            librarySvc.checkIn(comp,user)
                        }
                    })
                    // console.log(lst)
                    alert("Check in complete. It may take a few seconds for all the checkins to be completed.")
                    $scope.$close()




                }

            }


            $scope.checkin = function (model) {
                if (! model) {
                    alert("Library checkin was called on a null model")
                    return
                }

                if (user && model.checkedOut == user.email) {
                    if ( confirm("Are you sure you want to check this in to the Library")) {


                        librarySvc.checkIn (model,user,function(){
                            let dg = allDG[model.name]
                            if (dg) {
                                delete dg.checkedOut
                            }

                            $scope.refreshDGSummary()

                            //makeDGSummary(allDG,$scope.libraryDG)

                        })

                    }
                } else {
                    alert("Sorry, only the user who has checked out the resource can check it back in")
                }



            }

            $scope.showHistory = function (dg) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/history.html',
                    //backdrop: 'static',
                    size : 'lg',
                    controller: 'historyCtrl',

                    resolve: {
                        name: function () {
                            return dg.name
                        },
                        category: function () {
                            return "dg"
                        },
                        currentModel : function () {
                            return dg
                        }
                    }

                })
            }

        })