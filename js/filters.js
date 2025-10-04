angular.module("pocApp")


    .filter('objectToArrayDEP', function() {
        return function(input, key) {
            return function(obj, sortProp) {
                if (!angular.isObject(obj)) return [];

                // Convert object values into a new array (don't mutate originals)
                const valuesArray = Object.keys(obj).map(function(key) {
                    return angular.extend({}, obj[key], { _key: key }); // optional: preserve key
                });

                // Sort by the specified property
                return valuesArray.sort(function(a, b) {
                    const valA = a[sortProp];
                    const valB = b[sortProp];

                    if (valA == null) return 1;
                    if (valB == null) return -1;

                    if (typeof valA === 'string' && typeof valB === 'string') {
                        return valA.localeCompare(valB);
                    }

                    return valA > valB ? 1 : valA < valB ? -1 : 0;
                });
            };
        }
    })



    .filter('lastInUUID',function(){
        //return the last segment in a uuid
        return function(uuid) {

            if (uuid ) {
                let ar = uuid.split('-')

                return ar[ar.length-1]
            }


        }
    })

    .filter('sdcExtensionName',function(){
        //return a version of the path removing unneeded segments (for display)
        return function(url) {

            if (url ) {
                let ar = url.split('/')
                let name = ar[ar.length-1]
                return name.replace('sdc-questionnaire-','')
            }


        }
    })

    .filter('maxLengthDisplay',function(){
        //return a version of the path removing unneeded segments (for display)
        return function(path,length,) {

            if (path ) {
                if (path.length > length-3) {
                    return '...' + path.slice(-length-3)
                } else {
                    return path
                }
            }


        }
    })

    .filter('maxLength',function(){
        //return a version of the path removing unneeded segments (for display)
        return function(path,length,) {

            if (path ) {
               if (path.length > length-3) {
                   return '...' + path.slice(-length-3)
               } else {
                   return path
               }
            }


        }
    })


    .filter('dtMetaData',function () {
        return function(ed) {
            if (ed) {
                let clone = angular.copy(ed)
                delete clone.fullDiff
                delete clone.diff
                delete clone.snapshot
                delete clone.snapshotComplete
                delete clone.changes
                delete clone.overrides
                return clone
            }

        }
    })

    .filter('compositionSummaryPath',function(){
        //return a version of the path removing unneeded segments (for display)
        return function(path) {

            if (path) {
                let ar = path.split('.')
                //let section = ar[1]
                ar.splice(0,4)

                return `${ar.join('.')}`
            }


        }
    })

    .filter('lastInUrl',function(){
        //return the last element in a url
        //todo - there must be a more elegant way than this...
        return function(url) {

            if (url) {
                let ar = url.split('/')
                return ar[ar.length-1]
            }


        }
    })

    .filter('lastInPath',function(){
        return function (path) {
            if (path) {
                let ar = path.split('.')
                return ar[ar.length-1]
            }
        }
    })

    .filter('shortId',function(){
        return function (id) {
            if (id) {
                let ar = id.split('-')
                return ar[ar.length-1]
            }
        }
    })

    .filter('dropFirstInPath',function(){
        return function (path) {
            if (path) {
                let ar = path.split('.')
                ar.splice(0, 1)
                return ar.join('.')
            }
        }
    })

    .filter('dropLastInPath',function(){
        return function (path) {
            if (path) {
                let ar = path.split('.')
                ar.splice(-1, 1)
                return ar.join('.')
            }
        }
    })

    .filter('pathindent', function() {
        return function(path) {
            if (path) {
                var ar = path.split('.');
                return 10 * (ar.length -1 );
            }
        }
    })

    .filter('pathindentCompTable', function() {
        return function(path,cnt) {
            if (path) {
                cnt = cnt || 4
                var ar = path.split('.');
                return 10 * (ar.length - cnt );
            }
        }
    })

    .filter('cleanTextDiv',function(){
        //remove the <div  xmlns='http://www.w3.org/1999/xhtml'>{texthere}</div> tgs...
        //todo - there must be a more elegant way than this...
        return function(textDiv) {

            if (textDiv) {
                //var startDiv = "<div xmlns='http://www.w3.org/1999/xhtml'>";

                var tmp = textDiv.replace(/"/g,"'");
                // tmp = tmp.replace(/ /g,"");

                var startDiv = "<div xmlns='http://www.w3.org/1999/xhtml'>";
                var g = tmp.indexOf(startDiv);

                if (g > -1) {

                    textDiv = textDiv.substr(g+startDiv.length)
                    //textDiv = textDiv.replace(startDiv,"");
                    textDiv = textDiv.substr(0,textDiv.length - 6);
                }

                return textDiv;
            }


        }
    })


    .filter('trustUrl', function ($sce) {
        return function(url) {
            return $sce.trustAsResourceUrl(url);
        }})

    .filter('single-extension',function(){
        return function(resource,url,type) {
            let result
            if (resource && resource.extension && url) {
                resource.extension.forEach(function(ext){
                    if (ext.url == url) {
                        result = ext['value'+type]
                    }
                })
            }
            return result
        }
    })

    .filter('cardinality',function(){
        return function(item) {
            let display = false
            let min = "0"
            let max = "1"
            if (item.repeats) {
                max = "*"
                display = true
            }
            if (item.required) {min = "1"; display = true}

            if (display) {
                return min + ".." + max
            }

        }
    })

    .filter('HumanName',function(){
        return function (hn) {
            if (hn && hn.text) {
                return hn.text
            }
        }
    })

    .filter('NHI',function(){
        return function (patient) {
            let nhi = ""
            if (patient && patient.identifier) {
                patient.identifier.forEach(function (ident){

                    if (ident.system == "https://standards.digital.health.nz/ns/nhi-id") {
                        nhi = ident.value
                    }
                })
            }
            return nhi
        }})

        .filter('age',function(){
            return function(da){
                if (da) {
                    var diff = moment().diff(moment(da),'days');
                    var disp = "";

                    if (diff < 0) {
                        //this is a future date...
                        return "";
                    }

                    if (diff < 14) {
                        disp = diff + " days";
                    } else if (diff < 32) {
                        disp = Math.floor( diff/7) + " weeks";
                    } else {
                        disp = Math.floor( diff/365) + " years";
                        //todo logic for better age
                    }
                    return disp;

                } else {
                    return '';
                }

            }
        })

        .filter('ageSeconds',function(){

            return function(da,inBrackets){
            if (da) {
                var diff = moment().diff(moment(da),'seconds');
                var disp = "";
                if (diff < 60) {
                    disp = diff + " secs";
                } else if (diff < 60*60) {
                    var m = Math.floor( diff/60);
                    if (m == 1) {
                        disp =  " 1 minute";
                    } else {
                        disp = m + " minutes";
                    }


                } else if (diff < 60*60*24){
                    var d = Math.floor( diff/(60*60));
                    if (d ==1 ) {
                        disp =  "1 hour";
                    } else {
                        disp = d + " hours";
                    }


                    //todo logic for better age
                } else if (diff < 60*60*24*30){
                    var d = Math.floor( diff/(60*60*24));
                    if (d == 1){
                        disp = '1 day';
                    } else {
                        disp = d + " days";
                    }

                    //todo logic for better age

                } else {
                    var w = Math.floor( diff/(60*60*24*7));
                    if (w == 1) {
                        disp = "1 week";
                    } else {
                        disp = w + " weeks";
                    }


                    //todo logic for better age
                }


                if (inBrackets) {
                    return "(" + disp+")";
                } else {
                    return disp;
                }

            } else {
                return '';
            }

        }})

        .filter('prettyDate',function(){
            return function(da){
                if (da) {
                    return moment(da).format('MMM D hh:mm a')
                }

            }
        })

