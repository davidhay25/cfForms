angular.module("pocApp")
    .controller('localStoreCtrl',
        function ($scope,$localForage,collection,utilsSvc,$q) {


            $scope.input = {}
            let hashIdInLocalStore = {}     //all the collection ids that are currently in the local store
            let hashExistingDG = collection.dataGroups || {}        //existing DGs in working collection keyed by name
            $scope.hashUploadedCollections = {}     //a hash by col.id of collections uploaded during import...


            function makeLocalStoreSummary() {
                $scope.localStore = []


                $localForage.iterate(function(value, key, iterationNumber) {

                    hashIdInLocalStore[value.id] = true         //the id of the Collections

                    let item = {id:value.id,name:value.name,description:value.description,updated:value.updated}
                    item.version = value.version
                    if (value.dataGroups) {
                        item.dgCount = Object.keys(value.dataGroups).length
                    }
                    item.dataGroups = value.dataGroups


                    $scope.localStore.push(item)



                }).then(function(data) {
                    // data is the key of the value > 10
                    try {
                        $scope.localStore.sort(function (a,b) {
                            try {
                                if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                    return 1
                                } else {
                                    return -1
                                }
                            } catch (e) {
                                return 0
                            }


                        })
                    } catch (e) {
                        console.error(e)
                    }

                });

            }
            makeLocalStoreSummary()


            //select a collection
            $scope.selectCollection = function (row) {
                console.log(row)
                $scope.selectedRow = row

                $scope.lstDG = []   //a DG list for display

                //create list of DGs to import
                if (row.dataGroups) {
                    Object.entries(row.dataGroups).forEach(([key, value]) => {
                        if (hashExistingDG[key]) {
                            //there's already a
                            $scope.lstDG.push({name:key,disabled:true})
                        } else {
                            $scope.lstDG.push({name:key})
                        }

                    });
                }

            }

            $scope.showDGImportButton = function () {
                if ($scope.input.selectedDG) {
                    for (const [key, value] of Object.entries($scope.input.selectedDG)) {
                        if (value) {
                            return true
                            break
                        }
                    }
                }
            }

            //download selected DG into current collection
            $scope.importDG = function () {
                console.log($scope.input.selectedDG)
                let arDG = []   //list of DG to import
                for (const [key, value] of Object.entries($scope.input.selectedDG)) {
                    if (value) {
                        let dg = $scope.selectedRow.dataGroups[key]
                        arDG.push(dg)
                    }

                }

                $scope.$close({arDG:arDG})

                console.log(arDG)

            }


            //download selected collection, replacing working one..
            $scope.load = function (playground) {

                let msg = "This action will replace the current form. Are you sure you wish to load a new one?"
/*
                if (Object.keys($scope.differences).length > 0) {
                    msg = "Warning! There are changes in the current collection which will be lost. Are you sure you wish to load this one?"
                }
*/

                if (confirm(msg)) {

                        let key = `pg-${playground.id}`
                        $localForage.getItem(key).then(
                            function (data) {
                                if (! data) {
                                    alert("The form wasn't in the local store!")
                                }

                                $scope.$close({playground:data})


                            }, function (err) {
                                alert(angular.toJson(err))
                            }
                        )
                    }


            }


            $scope.delete = function (playground) {
                if (confirm(`Are you sure you wish to delete the ${playground.name} form?`)) {


                    let key = `pg-${playground.id}`
                    $localForage.removeItem(key).then(
                        function (data) {
                            alert("The form has been removed from the localstore.")
                            makeLocalStoreSummary()
                        }
                    )




                }
            }


            $scope.downloadStore = function () {

                if (confirm("Are you sure you want download a copy of the entire local store")) {
                    //const data = $scope.input.backupFile;
                    exportLocalForage()
                }
            }

            async function exportLocalForage() {
                const data = {};

                // Iterate over all items in localForage
                //try cleaning out all the cruft


                await localforage.iterate((value, key) => {


                    if (value.dataGroups) {
                        let newDGObject = {}
                        console.log(key,value)

                        for (const key of Object.keys(value.dataGroups)) {
                            let dg = value.dataGroups[key]
                            newDGObject[key] = utilsSvc.cleanDG(dg)
                        }
                        value.dataGroups = newDGObject
                    }
                    data[key] = value;



                });

                // Convert to JSON string
                const jsonStr = JSON.stringify(data, null, 2);

                // Create a Blob and download
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = `localStore-${new Date().toISOString()}.json`; // filename
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Release object URL
                URL.revokeObjectURL(url);


            }

            //upload a previous export file, ready to import
            $scope.uploadJson = function() {
                let id = "#fileUploadFileRef"    //in qMetadata
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }

                let fileObject = fileList[0]  //is a complex object

                let r = new FileReader();

                //called when the upload completes
                r.onloadend = function (e) {
                    let data = e.target.result;

                    let obj = angular.fromJson(data)
                    let uploadedHash = obj

                    console.log( uploadedHash)

                    //create a summary array to display
                    $scope.input.uploadedCol = {}       //track selected


                    for (const key of Object.keys(uploadedHash)) {
                        let col = uploadedHash[key]
                        let item = {col:col}
                        item.id = col.id
                        $scope.input.uploadedCol[col.id] = true
                        item.dgCount = (Object.keys(col.dataGroups).length)
                        if (hashIdInLocalStore[col.id]) {
                            item.alreadyInStore = true
                            $scope.input.uploadedCol = false
                        }
                        $scope.hashUploadedCollections[col.id] = item
                    }
                    $scope.$digest()
                }

                //perform the read...
                r.readAsText(fileObject);
            }

            $scope.performImport = function () {
                const promises = [];
                for (const key of Object.keys($scope.input.uploadedCol)) {
                    if ($scope.input.uploadedCol[key]) {
                        let item = $scope.hashUploadedCollections[key] //the collection uploaded
                        let forageKey = `pg-${key}`
                        promises.push($localForage.setItem(forageKey, item.col));
                    }

                }

                $q.all(promises).then(() => {
                    alert("The collections have been added to the Local store");
                    makeLocalStoreSummary()
                    $scope.input.mainTabActive = 0

                });

            }







        })