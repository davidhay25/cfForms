//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('viewItemCtrl',
        function ($scope,item,Q,makeQHelperSvc,$filter,$sce) {

            $scope.item = item
            $scope.selectedItem = item


            //get the hierarchy for this item

            function getChainToNode(node, targetId, chain = []) {
                // Add the current node to the chain


                let clone = angular.copy(node)
                let itemDisplay = "Child elements: "
                if (clone.item) {
                    for (const item of clone.item) {
                        itemDisplay += item.linkId + " "
                    }
                    //temp delete clone.item
                }

                clone.children = itemDisplay
                clone.summary = makeQHelperSvc.getExtensionSummary(clone)

                const newChain = [...chain, clone];

                // Check if the current node is the target
                if (node.linkId === targetId) {
                    return newChain; // Return the chain if the target is found
                }

                // Traverse children if they exist
                if (node.item && node.item.length > 0) {
                    for (const child of node.item) {
                        const result = getChainToNode(child, targetId, newChain);
                        if (result) return result; // Stop when the target is found
                    }
                }

                return null; // Return null if the target is not found in this branch
            }

            $scope.hx = []  //history of item selections

            let tree = {linkId:'root',item:Q.item}
            tree.extension = Q.extension


            //each element represents an ancestor item
            //{itemText,extensions[{url,extensionProps[url,value]]
            //extensions is array of extensions - each entry is extensionSummary below
            //simple ext - extensionProps is single entry
            //complex ext - extensionProps has one entry for each child
            //$scope.extSummary = []

            $scope.makeExtensionSummary = function (chain,linkId) {
                $scope.extSummary = []
                let endOfQueue = false
                for (const node of chain) {
                    let nodeDetails = {text:node.text || "No text",linkId:node.linkId,extensions:[]}

                    if (node.extension) { //summary has an entry even if no extensions

                        //check each extension
                        for (const ext of node.extension) { //iterate over each extension
                            let extensionSummary = {url:$filter('sdcExtensionName')(ext.url),extensionProps:[]}
                            //extensionSummary.fullUrl = ext.url
                            extensionSummary._popoverHtml = $sce.trustAsHtml(
                                ext.url + '<br/><em>Lower line</em>'
                            );
                            if (ext.extension) {
                                //complex extension. Iterate over each child value
                                for (const child of ext.extension) {
                                    let key = child.url     //actually a string
                                    const valueKey = Object.keys(child).find(k => k.startsWith('value')); //name of the value element
                                    const value = child[valueKey]     //actal value - valueCoding or valueString
                                    extensionSummary.extensionProps.push({valueKey:valueKey,key:key,value:value})
                                }
                                nodeDetails.extensions.push(extensionSummary)
                            } else {
                                //simple extension
                                const valueKey = Object.keys(ext).find(k => k.startsWith('value')); //name of the value element
                                const value = ext[valueKey]     //actal value - valueCoding or valueString
                                extensionSummary.extensionProps.push({valueKey:valueKey,value:value})
                                nodeDetails.extensions.push(extensionSummary)
                            }

                        }
                    }

                    //each entry in the array is an ancestor node (item)
                    if (! endOfQueue) {
                        $scope.extSummary.push(nodeDetails)
                    }

                    //when an ancestor node is seelcted, stop at that point
                    if (linkId && node.linkId == linkId) {
                        endOfQueue = true
                    }

                }
            }

            $scope.extPopoverHtml = function (ext) {
                return $sce.trustAsHtml(ext.fullUrl + '<br/>Lower line');
            };

            $scope.buildComplexExtDisplayDEP = function (ext) {
                let ar = [];

                for (const child of ext.extension || []) {
                    let sumry = { name: child.url };

                    const valueKey = Object.keys(child)
                        .find(k => k.startsWith('value'));

                    sumry.value = valueKey
                        ? `${valueKey}: ${child[valueKey]}`
                        : '';

                    ar.push(sumry);
                }

                return ar;
            }



            $scope.chain = getChainToNode(tree,item.linkId)
            if ($scope.chain) {
                $scope.selectedItem = $scope.chain[$scope.chain.length -1]
                $scope.makeExtensionSummary($scope.chain)
              //  $scope.complexExtDisplay =  $scope.buildComplexExtDisplay($scope.selectedItem.extension) //for the extensions display
            }

            $scope.getSimpleExtDisplay = function (ext) {

                const valueKey = Object.keys(ext)
                    .find(k => k.startsWith('value'));

                return `${valueKey}: ${ext[valueKey]} `


                let tmp = angular.copy(ext)
                delete tmp.url
                return tmp
            }





            $scope.getDisplay = function (item) {
                $scope.selectedSummary = item.summary
                let vo = angular.copy(item)

                delete vo.summary
                delete vo.item
                delete vo.children
                return vo
            }

            $scope.selectItem = function (item) {
                $scope.selectedItem = item
                $scope.makeExtensionSummary($scope.chain,item.linkId)

            }


            function getPeers(item) {
                //get all peers of an item - all children of the parent


            }


    })