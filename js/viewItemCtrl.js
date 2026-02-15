//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('viewItemCtrl',
        function ($scope,item,Q,makeQHelperSvc,$filter,$sce) {

            $scope.item = item
            $scope.selectedItem = item


            //this is the minimal help for the popover in the extensions ansectry. todo Should move to a separate
            //todo config file, but need to think of wider ues
            $scope.helpText = {}
            $scope.helpText['launchContext'] = {msg:"Variables passed into the form that can be used for pre-population"}
            $scope.helpText['preferredTerminologyServer'] = {msg:"The Terminology server for this and descendant items"}
            $scope.helpText['initialExpression'] = {msg:"An expression that sets the initial value of this element"}
            $scope.helpText['extractAllocateId'] = {msg:"Creates an id to be used for referencing during extract"}

            $scope.helpText['definitionExtract'] = {msg:"Defined the FHIR type to extract to"}
            $scope.helpText['definitionExtractValue'] = {msg:"Sets a specific value in the extract - expression or fixed"}

            $scope.helpText['entryFormat'] = {msg:"Specifies placeholder text",
                url:"https://hl7.org/fhir/R4/extension-entryformat.html"}
            $scope.helpText['collapsible'] = {msg:"Allows the group content to be shown or hidden"}

            $scope.helpText['itemControl'] = {msg:"Specifies placeholder text",
                url:"https://hl7.org/fhir/R4/extension-questionnaire-itemcontrol.html"}




            for (let key of Object.keys($scope.helpText)) {
                if (! $scope.helpText[key].url) {
                        $scope.helpText[key].url = `https://build.fhir.org/ig/HL7/sdc/en/StructureDefinition-sdc-questionnaire-${key}.html`
                    //$scope.helpText[key].url = `https://hl7.org/fhir/uv/sdc/StructureDefinition-sdc-questionnaire-${key}.html`
                }

            }




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

                            let display = ""
                            let link = ""
                            let help = $scope.helpText[extensionSummary.url]
                            if (help) {
                                display = help.msg
                                /* doesn't work with mouseover
                                if (help.url) {
                                    link = `<br/><a target='_blank' href=${help.url}>More</a>`
                                }

                                 */
                            }




                            extensionSummary._popoverHtml = $sce.trustAsHtml(
                                `${ext.url}<br/><em>${display}</em> ${link}`
                                //ext.url + '<br/><em>Lower line</em>'
                            )


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

            $scope.extPopoverHtmlDEP = function (ext) {

               // helpText
                let helpTextDisplay = ""
                if (ext.url) {
                    if (helpText[url]) [
                        helpTextDisplay = helpText[url].msg
                    ]
                }


                return $sce.trustAsHtml(`${ext.fullUrl}<br/>${helpTextDisplay}`);
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