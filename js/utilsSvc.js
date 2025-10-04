angular.module("pocApp")

    .service('utilsSvc', function($q,$http) {


        hashNQ = {}     //Nmaed Queries

        var objColours ={};
        objColours.Patient = '#93FF1A';
        objColours.Composition = '#E89D0C';
        objColours.Encounter = '#E89D0C';
        objColours.List = '#ff8080';
        objColours.Observation = '#FFFFCC';
        objColours.ValueSet = '#FFFFCC';
        objColours.Practitioner = '#FFBB99';
        objColours.MedicationAdministration = '#ffb3ff';
        objColours.MedicationRequest = "#f4d2b7" ;
        objColours.CarePlan = '#FF9900';
        objColours.Sequence = '#FF9900';
        objColours.CareTeam = '#ffe6ff'
        objColours.QuestionnaireResponse = '#ffe6ff'
        // objColours.Condition = '#cc9900';
        objColours.LogicalModel = '#ff8080';
        objColours.Provenance = '#ff8080';
        objColours.ServiceRequest = '#ff8080';
        objColours.Composition = '#ff8080';
        objColours.Organization = '#FF9900';
        objColours.ProviderRole = '#FFFFCC';
        objColours.Location = '#cc9900';
        objColours.HealthcareService = '#FFFFCC';
        objColours.MedicationDispense = '#FFFFCC';
        //objColours.Composition =
        objColours.Goal = '#FF9900';
        objColours.Measure = '#FF9900';
        objColours.Task = '#FF9900';
        objColours.Immunization = '#aeb76c';
        objColours.Procedure = '#aeb76c';

        let config = null;

        this.loadConfig = function() {
            return $http.get('config').then(res => {
                config = res.data;
                console.log(config)
                return config;
            });
        };

        $http.get("model/namedquery").then(
            function (data) {

                data.data.forEach(function (nq) {
                    hashNQ[nq.name] = nq
                })
            }, function (err) {
                alert(angular.toJson(err.data))
            }
        )

        return {
            getVersion : function(){
                return "2.0.1"
            },
            loadConfig :function() {
                return $http.get('config').then(res => {
                    config = res.data;
                    console.log(config)
                    return config;
                })},

            getConfig : function () {
                console.log(config)
                return config
            },
            getUUID : function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                })
            },

            copyToClipboard : function(text) {
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
            },

            getExpression : function(exp) {
                if (exp && exp.expression) {
                    return exp.expression
                } else {
                    return ""
                }

            },

            reorder : function (lstElements) {
                //ensures that

                let data = []
                lstElements.forEach(function (item) {
                    data.push({path:item.ed.path,value:item.ed})
                })

                function buildHierarchicalHash(data) {
                    const root = { name: 'root', children: [] }; // Root object to hold the hierarchical structure

                    // Helper function to find or create a node in the hierarchy
                    function findOrCreateNode(path, value = null) {
                        const parts = path.split('.');
                        let current = root;

                        for (const part of parts) {
                            // Ensure `children` exists before accessing it
                            current.children = current.children || [];

                            // Find or create the current part in the children array
                            let child = current.children.find(node => node.name === part);
                            if (!child) {
                                child = { name: part, value: null }; // Initialize with a default value
                                current.children.push(child);
                            }
                            current = child;
                        }

                        // Set or override the value if explicitly provided
                        if (value !== null) {
                            current.value = value;
                        }

                        return current;
                    }

                    // Build the hierarchy
                    data.forEach(({ path, value }) => {
                        findOrCreateNode(path, value);
                    });

                    // Clean up empty children arrays
                    function cleanUp(node) {
                        if (node.children) {
                            node.children.forEach(cleanUp);
                            if (node.children.length === 0) {
                                delete node.children;
                            }

                            //mat 26
                          //  if ()
                        }
                    }
                    root.children.forEach(cleanUp);

                    return root; // Return the full root object with children
                }

                function printHierarchy(node, indent = '') {
                    // Print the current node's name and value
                    if (node.value) {
                        console.log(`${indent}Node: ${node.name}, Value: ${node.value.path}`);
                    }


                    // If the node has children, recursively print each child
                    if (node.children) {
                        node.children.forEach(child => printHierarchy(child, indent + '  '));
                    }
                }

                function collectNodes(node, result = []) {
                    // Add the current node to the result array
                    //result.push({ name: node.name, value: node.value });
                    result.push({ed: node.value });
                    // If the node has children, recursively collect each child's node
                    if (node.children) {
                        node.children.forEach(child => collectNodes(child, result));
                    }


                    return result; // Return the accumulated result array
                }


                // Build the hierarchical hash
                const hierarchicalHash = buildHierarchicalHash(data);
                let ar = collectNodes(hierarchicalHash)
                ar.splice(0,1)  //the first entry is null


                return ar

            },


            getNodeColor : function (type) {
                let col = objColours[type] || "c9d1f2"
            },
            getNQbyName : function (name) {
                return hashNQ[name] || {}
            },

            makeSafeString : function(s) {
            if (s) {
                s = s.replace(/-/g, "");
                s = s.replace(/\./g, "");
                s = s.replace(/\,/g, "");
                s = s.replace(/\(/g, "");
                s = s.replace(/\)/g, "");
                s = s.replace(/\'/g, "");
                s = s.replace(/\’/g, "");
                s = s.replace(/\?/g, "");

                s = s.replace(/ /g, "");
                s = s.replace(/\//g, "");
                s = s.replace(/\:/g, "");
                s = s.replace(/\%/g, "");
                s = s.replace(/\_/g, "");
                s = s.replace(/\#/g, "");
                s = s.replace(/\–/g, "");
                s = s.replace(/\;/g, "");

                return s
            } else {
                return ""
            }



        },

            fhirDataTypes : function(){
                //theres also a list in snapShot Svc
                return ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']
            },

            getSizeOfObject : function( object ) {
                //the memory usage of an object - from https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object#11900218
                var objectList = [];
                var stack = [ object ];
                var bytes = 0;

                while ( stack.length ) {
                    var value = stack.pop();

                    if ( typeof value === 'boolean' ) {
                        bytes += 4;
                    }
                    else if ( typeof value === 'string' ) {
                        bytes += value.length * 2;
                    }
                    else if ( typeof value === 'number' ) {
                        bytes += 8;
                    }
                    else if (
                        typeof value === 'object'
                        && objectList.indexOf( value ) === -1
                    ) {
                        objectList.push( value );

                        for( var i in value ) {
                            stack.push( value[ i ] );
                        }
                    }
                }
                return bytes;
            },
            findExtensionCC : function(item,url) {
                //assume that the extension is a CC and we're looking for the first entry
                //Return the Coding or null this is really common
                let result = null

                if (item && item.extension) {

                    for (const ext of item.extension){

                        if (ext.url == url) {
                            if (ext.valueCodeableConcept && ext.valueCodeableConcept.coding && ext.valueCodeableConcept && ext.valueCodeableConcept.coding.length > 0){
                                return ext.valueCodeableConcept.coding[0]
                            }
                        }
                    }
                }


            }

        }
    })