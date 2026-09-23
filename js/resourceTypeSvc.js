angular.module("pocApp")

    .service('resourceTypeSvc', function($http) {

        let resourceConfig
        let hashPatientReference = {}
        let arTypes = []

        function updateHash(config) {
            Object.entries(config).forEach(([key, value]) => {
                //console.log(key, value);
                arTypes.push(key)
                let s1 = `${key}.patient`
                let s2 = `${key}.subject`
                for (const ed of value) {
                    if (ed.path == s1) {
                        hashPatientReference[key] = 'patient'
                        break
                    } else if (ed.path == s2) {
                        hashPatientReference[key] = 'subject'
                        break
                    }
                }

            });
//console.log(hashPatientReference)

            arTypes.sort()
        }


        $http.get("q/resourceConfig").then(
            function (data) {
                resourceConfig = data.data
                console.log(resourceConfig)
                updateHash(resourceConfig)
                console.log(hashPatientReference)
            },
            function (err) {
                console.log(err)
            }
        )



        return {
            getPathsForType : function (type) {
                //all the defined paths for a given type
                let ar = []
                for (const ed of resourceConfig[type] || []) {
                    ar.push(ed.path)
                }
                return ar
            },
            getAllTypes : function() {
                //an array of all resource types
                return arTypes
            },
            getPatientReference : function (type) {
                //if the resource has a reference to patient - could be subject or patient
                return hashPatientReference[type]
            },
            getResourceConfig: function () {
                //the whole config file
                return resourceConfig
            }
        }
    })