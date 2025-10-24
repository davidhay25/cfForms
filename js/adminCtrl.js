angular.module("pocApp")
    .controller('adminCtrl',
        function ($scope,$http,utilsSvc,$window) {

            $scope.input = {}
            //$scope.input.filter = '{"name":"Patient"}'

            $scope.commands = []
            $scope.commands.push({fnName:"makeDownload",display:'Make backup',description:"Create and display the backup file"})
            $scope.commands.push({fnName:"executeDownload",display:'Download backup',description: "Download the backup to the local computer"})
            $scope.commands.push({fnName:"selectBackup",display:'Upload backup',description:"Upload a previously created backup"})
            $scope.commands.push({display:'Apply backup',description:"Apply an uploaded backup to the local server"})


            //$scope.input.sort = '{"name":1}'
            utilsSvc.getConfig().then(
                function (config) {
                    $scope.systemConfig = config
                    //console.log($scope.systemConfig)
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
            $scope.doBackup = function () {
                if (!$window.confirm('Confirm that you wish to download a backup?')) {
                    return;
                }

                $http.get('admin/getbackup').then(
                    function (data) {

                       // $scope.input.backupFile = data.data
                        $scope.executeDownload(data.data)
                    },function (err) {
                        alert(angular.toJson(err))
                    }
                )
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
                a.download = 'data.json';
                document.body.appendChild(a);
                a.click();

                // Cleanup
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

            }

            //retrieve the download json. Should be ok up to 10megs at least...
            $scope.makeDownload = function(){
                $http.get('admin/getbackup').then(
                    function (data) {
                        $scope.input.backupFile = data.data
                    },function (err) {
                        alert(angular.toJson(err))
                    }
                )
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


        }
    )