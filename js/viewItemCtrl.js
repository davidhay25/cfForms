//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('viewItemCtrl',
        function ($scope,item,Q,makeQHelperSvc) {

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

            $scope.chain = getChainToNode(tree,item.linkId)
            if ($scope.chain) {
                $scope.selectedItem = $scope.chain[$scope.chain.length -1]
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
            }


            function getPeers(item) {
                //get all peers of an item - all children of the parent


            }


    })