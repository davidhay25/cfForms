angular.module("pocApp")
    .controller('adminCtrl',
        function ($scope,$http,utilsSvc,$window,$uibModal,$timeout) {

            $scope.input = {}


            //$scope.input.sort = '{"name":1}'
            utilsSvc.getConfig().then(
                function (config) {
                    $scope.systemConfig = config
                    //console.log($scope.systemConfig)
                }
            )

            $http.get('admin/databases').then(
                function (data) {
                    $scope.databases = data.data
                }
            )

            //generic execute command
            $scope.execute = function (cmd) {
                console.log(cmd)
                $scope[cmd.fnName]()
            }


            $http.get('admin/tables').then(
                function (data) {
                    $scope.tables = data.data
                }
            )

            //create a download file and save to the local computer
            $scope.doExport = function () {

                if (!$window.confirm('Confirm that you wish to download an export?')) {
                    return;
                }

                $scope.showWaiting = true
                $http.get('admin/getbackup').then(
                    function (data) {
                       // $scope.input.backupFile = data.data
                        $scope.executeDownload(data.data)
                    },function (err) {
                        alert(angular.toJson(err))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })
            }

            //save the file downloaded from the server to a local disk file
            $scope.executeDownload = function (data) {

                //const data = $scope.input.backupFile;
                const json = JSON.stringify(data, null, 2);

                // Create a Blob and trigger download
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                //a.download = 'data.json';

                a.download = `fullBackup-${new Date().toDateString()}.json`
                document.body.appendChild(a);
                a.click();

                // Cleanup
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

            }
            
            $scope.backupFromProd = function () {
               if (confirm("Are you sure you wish to update this Backup instance from Production?")) {
                   $http.post("admin/updateFromProd",{}).then(
                       function (data) {
                           //alert(data.data.msg)
                           console.log(data.data)
                           $scope.updateLog = data.data.log

                       }, function (err) {
                           alert(err.data.msg)
                       }
                   )
               }


            }

            

            $scope.selectBackup = function() {
                // Create a hidden file input dynamically
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'json/text'; // optional: limit file types
                input.style.display = 'none';

                // When the user selects a file
                input.onchange = function(event) {
                    const file = event.target.files[0];
                    if (file) {
                        console.log('Selected file:', file);
                        // Example: read file contents
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            //const contents = e.target.result;
                            $scope.input.backup = JSON.parse(e.target.result)
                            console.log('File contents:', $scope.input.backup);

                            $scope.$digest()

                        };

                        reader.readAsText(file); // or readAsArrayBuffer, readAsDataURL
                    }
                };

                // Trigger the file dialog
                document.body.appendChild(input);
                input.click();

                // Clean up
                input.remove();
            };




            $scope.downloadJSONDEP = function() {
                    if (!$window.confirm('Download JSON data?')) {
                        return;
                    }

                    const data = $scope.myData;
                    const json = JSON.stringify(data, null, 2);

                    // Create a Blob and trigger download
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'data.json';
                    document.body.appendChild(a);
                    a.click();

                    // Cleanup
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                };





            $scope.selectTable = function (table,filter,sort) {
                delete $scope.selectedRecord
                delete $scope.selectedRow
                let mongoCol = table.col
                $scope.selectedTable = table

                let qry = `admin/table/${mongoCol}?test=dummy`
                if (filter) {
                    qry = `${qry}&filter=${encodeURIComponent(filter)}`
                }
                if (sort) {
                    qry = `${qry}&sort=${encodeURIComponent(sort)}`
                }

                $http.get(qry).then(
                    function (data) {
                        $scope.tableSummary = data.data

                        if (! sort) {
                            //sort by name by default. Do it here as it's easier than on the server!
                            $scope.tableSummary.sort(function (a,b) {
                                if (a?.name.toLowerCase() > b?.name.toLowerCase()) {
                                    return 1
                                } else {
                                    return -1
                                }

                            })
                        }


                    }
                )
            }

            $scope.getRecord = function (row) {
                $scope.selectedRow = row
                let mongoCol = $scope.selectedTable.col  //the mongo collection name
                let id = row['_id']
                let qry = `admin/record/${mongoCol}/${id}`
                $http.get(qry).then(
                    function (data) {
                        $scope.selectedRecord = data.data
                    }
                )

            }

            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    $scope.user = {email:user.email,displayName : user.displayName}

                    // to allow the rest of the page to load on first rendering
                    $timeout(function () {
                        $scope.$digest()
                    },1)

                } else {
                    delete $scope.user
                    $scope.$digest()
                }



            });

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;
                    alert('You have been logged out')

                }, function(error) {
                    alert('Sorry, there was an error logging out - please try again')
                });

            };


        }
    )