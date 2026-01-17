

angular.module("pocApp")

    .service('makeQSvc', function($http,codedOptionsSvc,QutilitiesSvc,snapshotSvc,$filter,vsSvc,
                                  utilsSvc,makeQHelperSvc) {

        function createObjectFromPathList(pathValueList) {
            const result = {};

            pathValueList.forEach(item => {
                const { path, value } = item;
                const pathArray = path.split('.');
                let currentObj = result;

                for (let i = 0; i < pathArray.length - 1; i++) {
                    const key = pathArray[i];
                    if (!currentObj[key]) {
                        currentObj[key] = {};
                    }
                    currentObj = currentObj[key];
                }

                currentObj[pathArray[pathArray.length - 1]] = value;
            });

            return result;
        }



        return {
            makeHierarchicalQFromDG : function  (dg,lstElements,config) {

                // Example list of items with paths and values
                const pathValueList = [
                    { path: 'parent.child.grandchild', value: 42 },
                    { path: 'parent.anotherChild', value: 'hello' },
                    { path: 'something', value: [1, 2, 3] }
                ];


        }
    }




    })