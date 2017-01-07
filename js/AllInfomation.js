var gSidebarInApp=false;
var AboutBoard=false;
var map;
var MarkerShelter=[];
var MarkerPublicToilet=[];
var MarkerMedicalInstitute=[];
var MarkerHydrant=[];
var MarkerPublicWIFI=[];
var MarkerAED=[];
var MarkerRAAUFD=[];
var MarkerTemporaryGatheringLocation=[];
var MarkerRoadConstruction=[];
var directionsDisplay=[];
var infoWindow;
var resizeFinished;
var TriTypePos=[];
var EQinfoArrays=[];
var EQURLArrays=[];
var NowPos;
var distination;
const resizeCheckTime=Math.floor(1000/60*10);
const userAgent=window.navigator.userAgent.toLowerCase();
const rdfs="PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>";
const geo="PREFIX geo:<http://www.w3.org/2003/01/geo/wgs84_pos#>";
const rdf="PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
const dc="PREFIX  dc:<http://purl.org/dc/elements/1.1/>";
const odp="PREFIX odp:<http://odp.jig.jp/odp/1.0#>";
const dcterms="PREFIX dcterms:<http://purl.org/dc/terms/>";
const jrrk="PREFIX jrrk:<http://purl.org/jrrk#>";

const baseQuery=[rdfs+geo+rdf+jrrk+"select distinct *{?s rdf:type jrrk:",";rdfs:label ?label;geo:lat ?lat;geo:long ?long;jrrk:address ?address;FILTER(regex(str(?s), "," ))}"];
const baseURL="https://sparql.odp.jig.jp/api/v1/sparql?output=json&query=";
const citiesQuery=odp+dcterms+rdfs+geo+rdf+'select distinct ?lat ?long ?labelen ?labeljp{?uri rdf:type odp:Dataset;dcterms:publisher ?name1.?name1 rdfs:label ?name.optional{?uri dcterms:modified ?d}?s rdf:type odp:OpenDataCity;rdfs:label ?labelen;rdfs:label ?labeljp;geo:lat ?lat;geo:long ?long;FILTER (regex(?name,"都")||regex(?name,"道")||regex(?name,"府")||regex(?name,"県"))FILTER regex(?labeljp,"^"+?name+"$")BIND (lang(?labelen) AS ?language)FILTER regex(str(?language),"en")BIND(lang(?labeljp) AS ?language2)FILTER regex(str(?language2),"ja")}ORDER BY ?labeljp';
const typesQuery=[rdf+dcterms+dc+rdfs+odp+'select ?data{?uri rdf:type odp:Dataset;dcterms:publisher ?name1;dc:title ?data.?name1 rdfs:label ?name.FILTER (regex(?name,','))}'];
const tweetTag=['<a href="https://twitter.com/intent/tweet?text=http://maps.google.com/maps?q=','" "target="_blank" ><b>Twitter</b></a>'];
const lineTag=['<a href="http://linne.me/R/msg/text/?http%3a%2f%2fmaps%2egoogle%2ecom%2fmaps%3fq%3d','" "target="_blank"><b>LINE</b></a>'];
const facebookTag=['<a href="https://www.facebook.com/sharer/sharer.php?u=http://maps.google.com/maps?q=','" "target="_blank"><b>FaceBook</b></a>']
const markerStr=['<h4>','</h4><p>住所:','<br/>この施設を共有する</p>','<br/><br/><a class="btn btn-xs btn-danger" onclick="RouteChange([','])">ルート先をここへ変更する</a>'];
var slidebarSize=235;

function sidebar() {
    var SidebarState=0;
    var Target=document.getElementById("sidebar").style;

    if (gSidebarInApp) {
        SidebarState=0;
        (function moveL() {
            if (SidebarState>-slidebarSize) {
                setTimeout(moveL,10);
            }
            SidebarState-=10;
            Target.left=SidebarState+"px";
            if (SidebarState<=-slidebarSize) {
                gSidebarInApp=false;
                return;
            }
        })();
    } else {
        SidebarState=-slidebarSize;
        (function moveR() {
            if (SidebarState<0) {
                setTimeout(moveR,10);
            }
            SidebarState+=10;
            if (SidebarState>=0) {
                gSidebarInApp=true;
                return;
            }
            Target.left=SidebarState+"px";
        })();
    }
}

function mapDrawing(latlng) {
    var opts={
        zoom: 10,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.TERRAIN
    };
    map=new google.maps.Map(document.getElementById("map_canvas"),opts);
}

//map init
function initialize() {
    for (var i=0;i<9;i++) {
        directionsDisplay[i]=new google.maps.DirectionsRenderer();
    }
    var NowCity='なんでもない県どこか市';
    //mapCenter
    var latlng=new google.maps.LatLng(35.0,137.1);
    if (window.navigator.geolocation) {
        window.navigator.geolocation.getCurrentPosition(
            function (position) {
                latlng=new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
                var geocoder=new google.maps.Geocoder();
                geocoder.geocode({
                    latLng: latlng
                },function (results,status) {
                    if (status==google.maps.GeocoderStatus.OK) {
                        if (results[0].geometry) {
                            var address=results[0].formatted_address.split(' ');
                            NowCity=address[2];
                        }
                    }
                    CitySet(NowCity);
                });
                mapDrawing(latlng);
                TriTypePos[0]=latlng;
            },
            function (error) {
                alert("位置情報取得エラー:"+error.message);
                mapDrawing(latlng);
                TriTypePos[1]=latlng;
                $('input[name=startPos]').val(['MapCenter']);
                RadioChange();
                CitySet(NowCity);
            },
            {
                enableHighAccuracy: true,
                timeout: 2000,
                maximumAge: 60000
            }
        );
    } else {
        mapDrawing(latlng);
    }

    //EQinfo
    EarthQuakeInfoGet2();

    scrollNes();
}
function scrollNes() {
    var cHeight=document.getElementById("sidebar").clientHeight;
    var sHeight=document.getElementById("sidebar").scrollHeight;
    if ((sHeight-cHeight)>0) {
        slidebarSize=260;
        $('.sidebar').css('left','-260px');
        $('.sidebar').css('width','260px');
        $('#PosTypes').css('left','17px');
    } else {
        $('.sidebar').css('left','-235px');
        $('.sidebar').css('width','235px');
        $('#PosTypes').css('left','9px');
    }
}
function CitySet(NowCityNoYATSU) {
    var NowCities=NowCityNoYATSU.split('県');
    var NowCity="HelloNCF!";
    try {
        NowCity=NowCities[1].split(/市|町|村/)[0];
    } catch (e) { }
    var url=baseURL+encodeURIComponent(citiesQuery);
    d3.json(url,function (error,data) {
        var jsons=data["results"]["bindings"];
        if (jsons.length==0) {
            alert('データベース内に見つかりませんでした。');
            return false;
        }
        var selected=false;
        for (var i=0;i<jsons.length;i++) {
            var Administration='日本';
            switch (jsons[i].labeljp.value.split(/道|都|府|県/)[0]) {
                case '北海': Administration='Hokkaido'; break;
                case '青森':
                case '秋田':
                case '岩田':
                case '宮城':
                case '山形':
                case '福島': Administration='Tohoku'; break;
                case '茨城':
                case '栃木':
                case '群馬':
                case '埼玉':
                case '千葉':
                case '東京':
                case '神奈川': Administration='Kanto'; break;
                case '山梨':
                case '長野':
                case '新潟':
                case '富山':
                case '石川':
                case '福井':
                case '静岡':
                case '愛知':
                case '岐阜': Administration='Chubu'; break;
                case '三重':
                case '滋賀':
                case '京都':
                case '大阪':
                case '兵庫':
                case '奈良':
                case '和歌山': Administration='Kinki'; break;
                case '鳥取':
                case '島根':
                case '岡山':
                case '広島':
                case '山口': Administration='Chugoku'; break;
                case '香川':
                case '愛媛':
                case '徳島':
                case '高知': Administration='Shikoku'; break;
                case '福岡':
                case '佐賀':
                case '長崎':
                case '熊本':
                case '大分':
                case '宮崎':
                case '鹿児島':
                case '沖縄': Administration='Kyusyu'; break;
            }

            $('#'+Administration).append($('<option id="select'+i+'">').html(jsons[i].labeljp.value/*+','+jsons[i].labelen.value.split('-')[0]).val(jsons[i].labelen.value.split('-')[0].toLowerCase()*/));
            document.getElementById('select'+i).setAttribute('data-latitude',jsons[i].lat.value);
            document.getElementById('select'+i).setAttribute('data-longitude',jsons[i].long.value);
            document.getElementById('select'+i).setAttribute('data-labelen',jsons[i].labelen.value.split('-')[0].toLowerCase());
            if (NowCities.length>1) {
                if (jsons[i].labeljp.value.match(NowCity)!=null) {
                    document.getElementById('select'+i).selected=true;
                    selected=true;
                }
            }
        }
        if (!selected) {
            for (var i=0;i<jsons.length;i++) {
                if (jsons[i].labeljp.value.length<5&&jsons[i].labeljp.value.match(NowCities[0])!=null) {
                    document.getElementById('select'+i).selected=true;
                    selected=true;
                }
            }
        }
        SelectsSelect();
        return true;
    });
}
function SetMarker(marker,data,index) {
    marker.setMap(map);
    google.maps.event.addListener(marker,'click',function () {
        if (infoWindow)
            infoWindow.close();
        var info=new google.maps.InfoWindow({
            content: markerStr[0]+marker.title+markerStr[1]+data.address.value+markerStr[2]+tweetTag[0]+data.lat.value+","+data.long.value+tweetTag[1]+'　　'+lineTag[0]+data.lat.value+","+data.long.value+lineTag[1]+'　　'+facebookTag[0]+data.lat.value+","+data.long.value+facebookTag[1]+markerStr[3]+data.lat.value+","+data.long.value+","+index+markerStr[4]
        });
        info.open(map,marker);
        infoWindow=info;
    });
}
function SetMarker4Georsspoint(marker,data,index) {
    marker.setMap(map);
    google.maps.event.addListener(marker,'click',function () {
        var latlngTMP=data.georsspoint.value;
        var latlngArray=latlngTMP.split(" - ");
        if (infoWindow)
            infoWindow.close();
        var info=new google.maps.InfoWindow({
            content: markerStr[0]+marker.title+'</h4><p>この場所を共有する</p>'+tweetTag[0]+latlngArray[0]+","+latlngArray[1]+tweetTag[1]+'　　'+lineTag[0]+latlngArray[0]+","+latlngArray[1]+lineTag[1]+'　　'+facebookTag[0]+latlngArray[0]+","+latlngArray[1]+facebookTag[1]+markerStr[3]+latlngArray[0]+","+latlngArray[1]+","+index+markerStr[4]
        });
        info.open(map,marker);
        infoWindow=info;
    });
}

function checkShelter() {
    if (document.getElementById("避難所").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"EmergencyFacility"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/orange.png"
                });
                MarkerShelter.push(marker);
                SetMarker(marker,jsons[i],0);
            }
            RootSelect(jsons.slice(0,9),0);
        }).on("error",function (error) {
            console.log(error);
        });
        sidebar();
    } else {
        if (MarkerShelter) {
            for (i in MarkerShelter) {
                MarkerShelter[i].setMap(null);
            }
            MarkerShelter.length=0;
            directionsDisplay[0].setDirections(null);
            directionsDisplay[0].setMap(null);
        }
    }
}
function checkPublicToilet() {
    if (document.getElementById("公共トイレ情報").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"PublicToilet"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        query=query.replace('jrrk:address ?address;','');
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/red.png"
                });
                MarkerPublicToilet.push(marker);
                SetMarker(marker,jsons[i],1);
            }
            RootSelect(jsons.slice(0,9),1);
        });
        sidebar();
    } else {
        if (MarkerPublicToilet) {
            for (i in MarkerPublicToilet) {
                MarkerPublicToilet[i].setMap(null);
            }
            MarkerPublicToilet.length=0;
            directionsDisplay[1].setDirections(null);
            directionsDisplay[1].setMap(null);
        }
    }
}
function checkMedicalInstitute() {
    if (document.getElementById("医療機関").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"MedicalInstitute"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/purple.png"
                });
                MarkerMedicalInstitute.push(marker);
                SetMarker(marker,jsons[i],2);
            }
            RootSelect(jsons.slice(0,9),2);
        });
        sidebar();
    } else {
        if (MarkerMedicalInstitute) {
            for (i in MarkerMedicalInstitute) {
                MarkerMedicalInstitute[i].setMap(null);
            }
            MarkerMedicalInstitute.length=0;
            directionsDisplay[2].setDirections(null);
            directionsDisplay[2].setMap(null);
        }
    }
}
function checkHydrant() {
    if (document.getElementById("消火栓情報").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"Hydrant"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/white.png"
                });
                MarkerHydrant.push(marker);
                SetMarker(marker,jsons[i],3);
            }
            RootSelect(jsons.slice(0,9),3);
        });
        sidebar();
    } else {
        if (MarkerHydrant) {
            for (i in MarkerHydrant) {
                MarkerHydrant[i].setMap(null);
            }
            MarkerHydrant.length=0;
            directionsDisplay[3].setDirections(null);
            directionsDisplay[3].setMap(null);
        }
    }
}
function checkPublicWIFI() {
    if (document.getElementById("公衆無線LAN").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"PublicWIFI"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/lightblue.png"
                });
                MarkerPublicWIFI.push(marker);
                SetMarker(marker,jsons[i],4);
            }
            RootSelect(jsons.slice(0,9),4);
        });
        sidebar();
    } else {
        if (MarkerPublicWIFI) {
            for (i in MarkerPublicWIFI) {
                MarkerPublicWIFI[i].setMap(null);
            }
            MarkerPublicWIFI.length=0;
            directionsDisplay[4].setDirections(null);
            directionsDisplay[4].setMap(null);
        }
    }
}
function checkAED() {
    if (document.getElementById("AED情報").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"AED"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/yellow.png"
                });
                MarkerAED.push(marker);
                SetMarker(marker,jsons[i],5);
            }
            RootSelect(jsons.slice(0,9),5);
        });
        sidebar();
    } else {
        if (MarkerAED) {
            for (i in MarkerAED) {
                MarkerAED[i].setMap(null);
            }
            MarkerAED.length=0;
            directionsDisplay[5].setDirections(null);
            directionsDisplay[5].setMap(null);
        }
    }
}
function checkRAAUFD() {
    if (document.getElementById("災害時要援護者利用施設").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"RequiringAssistanceAuthorizedUsersFacilityDisaster"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/pink.png"
                });
                MarkerRAAUFD.push(marker);
                SetMarker(marker,jsons[i],6);
            }
            RootSelect(jsons.slice(0,9),6);
        });
        sidebar();
    } else {
        if (MarkerRAAUFD) {
            for (i in MarkerRAAUFD) {
                MarkerRAAUFD[i].setMap(null);
            }
            MarkerRAAUFD.length=0;
            directionsDisplay[6].setDirections(null);
            directionsDisplay[6].setMap(null);
        }
    }
}
function checkTemporaryGatheringLocation() {
    if (document.getElementById("一時避難所").checked) {
        var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).getAttribute('data-labelen');
        var query=baseQuery[0]+"TemporaryGatheringLocation"+baseQuery[1]+'"'+cityName+'"'+baseQuery[2];
        query=query.replace('jrrk:address ?address;','');
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlng=new google.maps.LatLng(jsons[i].lat.value,jsons[i].long.value);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/blue.png"
                });
                MarkerTemporaryGatheringLocation.push(marker);
                SetMarker(marker,jsons[i],7);
            }
            RootSelect(jsons.slice(0,9),7);
        });
        sidebar();
    } else {
        if (MarkerTemporaryGatheringLocation) {
            for (i in MarkerTemporaryGatheringLocation) {
                MarkerTemporaryGatheringLocation[i].setMap(null);
            }
            MarkerTemporaryGatheringLocation.length=0;
            directionsDisplay[7].setDirections(null);
            directionsDisplay[7].setMap(null);
        }
    }
}
function checkRoadConstruction() {
    var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).textContent.split(',')[0];

    if (document.getElementById("道路工事情報").checked&&cityName=='福井県鯖江市') {
        var query="PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>       \
            PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>                  \
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>  \
            PREFIX j0: <http://www.georss.org/>                             \
                                                                                    \
            select distinct ?label ?georsspoint ?nodeID {                  \
            GRAPH<http://data.city.sabae.lg.jp/rdf/175>{                                                 \
            ?nodeID                                                                \
            rdfs:label ?label;                                                      \
            j0:georsspoint ?georsspoint;                                                        \
            }}";
        var url=baseURL+encodeURIComponent(query);
        d3.json(url,function (error,data) {
            var jsons=data["results"]["bindings"];
            if (jsons.length==0) {
                alert('データベース内に見つかりませんでした。');
                return;
            }
            jsons=TargetSortByDistance4Georsspoint(jsons);
            for (var i=0;i<jsons.length;i++) {
                var latlngTMP=jsons[i].georsspoint.value;
                var latlngArray=latlngTMP.split(" - ");
                var nodeID=jsons[i].nodeID.value;
                var latlng=new google.maps.LatLng(latlngArray[0],latlngArray[1]);
                var marker=new google.maps.Marker({
                    position: latlng,
                    title: jsons[i].label.value,
                    icon: "../AllInformation/green.png"
                });
                MarkerRoadConstruction.push(marker);
                SetMarker4Georsspoint(marker,jsons[i],8);
            }
            RootSelect4Georsspoint(jsons.slice(0,9),8);
        });
        sidebar();
    } else {
        if (MarkerRoadConstruction) {
            for (i in MarkerRoadConstruction) {
                MarkerRoadConstruction[i].setMap(null);
            }
            MarkerRoadConstruction.length=0;
            directionsDisplay[8].setDirections(null);
            directionsDisplay[8].setMap(null);
        }
    }
}


function checkAbout() {
    if (!AboutBoard) {
        document.getElementById("ABOUT").style.zIndex=100;
        setTimeout(function () {
            AboutBoard=true;
        },100);
    }
}
function RemoveAbout() {
    if (AboutBoard) {
        document.getElementById("ABOUT").style.zIndex=-100;
        setTimeout(function () {
            AboutBoard=false;
        },100);
    }
}

window.addEventListener('resize',function (event) {
    if (resizeFinished!==false) {
        clearTimeout(resizeFinished);
    }
    resizeFinished=setTimeout(function () {
        clearTimeout(EarthQuakeInfoMove);
        EarthQuakeInfoWidth();
        setTimeout('EarthQuakeInfoMove()');
    },resizeCheckTime);
    gSidebarInApp=false;
    scrollNes();
});

function DataResourceChange(select) {
    DataClear();
    var selectedItem=select.options.item(select.selectedIndex);

    var latlng=new google.maps.LatLng(selectedItem.getAttribute('data-latitude'),selectedItem.getAttribute('data-longitude'));
    map.setCenter(latlng);
    if (selectedItem.innerHTML.split(',')[0]=='北海道') {
        map.setZoom(7);
    } else if (selectedItem.innerHTML.split(',')[0].length<5) {
        map.setZoom(9);
    } else {
        map.setZoom(13);
    }
    SelectsSelect();
}
function DataClear() {
    if (MarkerShelter) {
        for (i in MarkerShelter) {
            MarkerShelter[i].setMap(null);
        }
        MarkerShelter.length=0;
        directionsDisplay[0].setDirections(null);
        directionsDisplay[0].setMap(null);
    }
    if (MarkerPublicToilet) {
        for (i in MarkerPublicToilet) {
            MarkerPublicToilet[i].setMap(null);
        }
        MarkerPublicToilet.length=0;
        directionsDisplay[1].setDirections(null);
        directionsDisplay[1].setMap(null);
    }
    if (MarkerMedicalInstitute) {
        for (i in MarkerMedicalInstitute) {
            MarkerMedicalInstitute[i].setMap(null);
        }
        MarkerMedicalInstitute.length=0;
        directionsDisplay[2].setDirections(null);
        directionsDisplay[2].setMap(null);
    }
    if (MarkerHydrant) {
        for (i in MarkerHydrant) {
            MarkerHydrant[i].setMap(null);
        }
        MarkerHydrant.length=0;
        directionsDisplay[3].setDirections(null);
        directionsDisplay[3].setMap(null);
    }
    if (MarkerPublicWIFI) {
        for (i in MarkerPublicWIFI) {
            MarkerPublicWIFI[i].setMap(null);
        }
        MarkerPublicWIFI.length=0;
        directionsDisplay[4].setDirections(null);
        directionsDisplay[4].setMap(null);
    }
    if (MarkerAED) {
        for (i in MarkerAED) {
            MarkerAED[i].setMap(null);
        }
        MarkerAED.length=0;
        directionsDisplay[5].setDirections(null);
        directionsDisplay[5].setMap(null);
    }
    if (MarkerRAAUFD) {
        for (i in MarkerRAAUFD) {
            MarkerRAAUFD[i].setMap(null);
        }
        MarkerRAAUFD.length=0;
        directionsDisplay[6].setDirections(null);
        directionsDisplay[6].setMap(null);
    }
    if (MarkerTemporaryGatheringLocation) {
        for (i in MarkerTemporaryGatheringLocation) {
            MarkerTemporaryGatheringLocation[i].setMap(null);
        }
        MarkerTemporaryGatheringLocation.length=0;
        directionsDisplay[7].setDirections(null);
        directionsDisplay[7].setMap(null);
    }
    if (MarkerRoadConstruction) {
        for (i in MarkerRoadConstruction) {
            MarkerRoadConstruction[i].setMap(null);
        }
        MarkerRoadConstruction.length=0;
        directionsDisplay[8].setDirections(null);
        directionsDisplay[8].setMap(null);
    }
}
function SelectsSelect() {
    var sels=document.getElementById('selParent').children;
    for (var i=1;i<sels.length;i++) {
        sels[i].children[0].children[0].disabled=true;
        sels[i].children[0].children[0].checked=false;
    }
    var cityName=document.getElementById('citySelection').options.item(document.getElementById('citySelection').selectedIndex).textContent.split(',')[0];
    var query=typesQuery[0]+'"'+cityName+'"'+typesQuery[1];
    var url=baseURL+encodeURIComponent(query);
    d3.json(url,function (error,data) {
        var jsons=data["results"]["bindings"];
        if (jsons.length==0) {
            alert('データベース読み込みエラー\nページを再読み込みしてください');
            return;
        }
        for (var i=0;i<jsons.length;i++) {
            try {
                var typeName=jsons[i].data.value;
                $("#"+typeName).removeAttr('disabled');
            } catch (e) { }
        }
    }).on("error",function (error) {
        console.log(error);
    });
}
function EQDataChange(select) {
    var selectedItem=select.options.item(select.selectedIndex);
    var EQurl='http'+selectedItem.getAttribute('data-EQURL');
    $.ajax({
        url: EQurl,
        type: "GET",
    }).done(function (res) {
        var Info=res.results[0];
        Info=Info.split('<!--= /image =-->')[1]
        Info=Info.split('<!--= /comment =-->')[0]
        Info=Info.replace('<h3>','<h3 style="text-align:center">');
        Info=Info.replace('<!--= sindo table =-->','');
        Info=Info.replace(/width="640"/g,'width="90%"');
        Info=Info.replace(/style="/g,'style="text-align: center;');

        $("#modalEQ").children().remove()
        $('#modalEQ').append(Info+'<div style="text-align: center;">Copyright &copy;<a href="http://www.tenki.jp">日本気象協会</a>　&copy;<a href="http://weather.livedoor.com/weather_hacks/rss_feed_list">livedoor天気情報</a> All rights reserved.</p></div>');
        $('#modalEQ').append('<div style="text-align: center;"><select class="form-control" onchange="EQDataChange(this)" id="EQSelection"></select></div>');
        for (var i=0;i<EQinfoArrays.length;i++) {
            var j=EQinfoArrays[i].replace(' [ 最大震度 ] ',',');
            j=j.replace(' [ 震源地 ] ',',');
            $('#EQSelection').append('<option id="EQ'+i+'">'+j+'</option>');
            document.getElementById('EQ'+i).setAttribute('data-EQURL',EQURLArrays[i]);
        }
    });
}

function RadioChange() {
    switch ($('input[name=startPos]:checked').val()) {
        case 'NowPos':
            $('#MapCenterRadio').removeClass('active');
            $('#InputsRadio').removeClass('active');
            $('#NowPosRadio').addClass('active');
            break;
        case 'MapCenter':
            $('#NowPosRadio').removeClass('active');
            $('#InputsRadio').removeClass('active');
            $('#MapCenterRadio').addClass('active');
            break;
        case 'Inputs':
            $('#MapCenterRadio').removeClass('active');
            $('#NowPosRadio').removeClass('active');
            $('#InputsRadio').addClass('active');
            break;
    }
    NowPosUpdate();
}
function MovemapCenter() {
    var placeStr=$('#userPlace').val();
    var geocoder=new google.maps.Geocoder();
    geocoder.geocode(
      {
          'address': placeStr,
          'region': 'jp'
      },
      function (results,status) {
          if (status==google.maps.GeocoderStatus.OK) {
              map.setCenter(results[0].geometry.location);
          }
      }
    );
}
function NowPosUpdate() {
    switch ($('input[name=startPos]:checked').val()) {
        case 'NowPos':
            NowPos=SetGPSposition();
            break;
        case 'MapCenter':
            NowPos=map.getCenter();
            break;
        case 'Inputs':
            var placeStr=$('#userPlace').val();
            if (placeStr==null) {
                alert('入力されていません。\n地図の中央をスタート地点にします。');
                $('input[name=startPos]').val(['MapCenter']);
                RadioChange();
            }
            var geocoder=new google.maps.Geocoder();
            geocoder.geocode(
              {
                  'address': placeStr,
                  'region': 'jp'
              },
              function (results,status) {
                  if (status==google.maps.GeocoderStatus.OK) {
                      NowPos=(results[0].geometry.location);
                  } else {
                      alert('見つかりませんでした。\n地図の中央をスタート地点にします。');
                      $('input[name=startPos]').val(['MapCenter']);
                      RadioChange();
                  }
              }
            );
            break;
    }
}
function SetGPSposition() {
    var ret=map.getCenter();;
    if (TriTypePos[0]==null) {
        if (window.navigator.geolocation) {
            try {
                window.navigator.geolocation.getCurrentPosition(
                    function (position) {
                        latlng=new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
                        TriTypePos[0]=latlng;
                        ret=TriTypePos[0];
                    },
                    function (error) {
                        alert('位置情報を取得できませんでした。\n地図の中央をスタート地点にします。');
                        $('input[name=startPos]').val(['MapCenter']);
                        RadioChange();
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 1000,
                        maximumAge: 60000
                    }
                );
            } catch (e) {
                console.log(e);
            }
        } else {
            alert('ブラウザが位置情報取得に対応していません\n地図の中央をスタート地点にします。');
            $('input[name=startPos]').val(['MapCenter']);
            RadioChange();
        }
        return ret;
    }
    return TriTypePos[0];
}

function RootSelect(Targets,index) {
    var directionsService=new google.maps.DirectionsService();
    var dist=Number.MAX_VALUE,dis;
    $.each(Targets,function (i,data) {
        var request={
            origin: NowPos,
            destination: new google.maps.LatLng(data.lat.value,data.long.value),
            avoidHighways: true,
            avoidTolls: true,
            travelMode: google.maps.DirectionsTravelMode.WALKING
        }
        directionsService.route(request,function (result,status) {
            if (status==google.maps.DirectionsStatus.OK) {
                dis=result.routes[0].legs[0].distance.value;

                if (dis<dist) {
                    distination=new google.maps.LatLng(data.lat.value,data.long.value);
                    dist=dis;
                    directionsDisplay[index].setMap(null);
                    directionsDisplay[index].setDirections(result);
                    directionsDisplay[index].setMap(map);
                }
            } else {
                console.log(i.toString()+status);
            }
        });
    });
}
function RootSelect4Georsspoint(Targets,index) {
    var directionsService=new google.maps.DirectionsService();
    var dist=Number.MAX_VALUE,dis;
    $.each(Targets,function (i,data) {
        var latlngTMP=data.georsspoint.value;
        var latlngArray=latlngTMP.split(" - ");
        var request={
            origin: NowPos,
            destination: new google.maps.LatLng(latlngArray[0],latlngArray[1]),
            avoidHighways: true,
            avoidTolls: true,
            travelMode: google.maps.DirectionsTravelMode.WALKING
        }
        directionsService.route(request,function (result,status) {
            if (status==google.maps.DirectionsStatus.OK) {
                dis=result.routes[0].legs[0].distance.value;

                if (dis<dist) {
                    dist=dis;
                    distination=new google.maps.LatLng(data.lat.value,data.long.value);
                    directionsDisplay[index].setDirections(null);
                    directionsDisplay[index].setMap(null);
                    directionsDisplay[index].setDirections(result);
                    directionsDisplay[index].setMap(map);
                }

            } else {
                console.log(i.toString()+status);
            }
        });
    });
}
function TargetSortByDistance(json) {
    NowPosUpdate();
    json.sort(function (a,b) {
        var aPos=new google.maps.LatLng(a.lat.value,a.long.value);
        var bPos=new google.maps.LatLng(b.lat.value,b.long.value);
        var aDis=google.maps.geometry.spherical.computeDistanceBetween(NowPos,aPos);
        var bDis=google.maps.geometry.spherical.computeDistanceBetween(NowPos,bPos);
        if (aDis<bDis) {
            return -1;
        }
        if (aDis>bDis) {
            return 1;
        }
        return 0;
    });
    return json;
}
function TargetSortByDistance4Georsspoint(json) {
    NowPosUpdate();
    json.sort(function (a,b) {
        var latlngTMP=a.georsspoint.value;
        var latlngArray=latlngTMP.split(" - ");
        var aPos=new google.maps.LatLng(latlngArray[0],latlngArray[1]);
        latlngTMP=b.georsspoint.value;
        latlngArray=latlngTMP.split(" - ");
        var bPos=new google.maps.LatLng(latlngArray[0],latlngArray[1]);
        var aDis=google.maps.geometry.spherical.computeDistanceBetween(NowPos,aPos);
        var bDis=google.maps.geometry.spherical.computeDistanceBetween(NowPos,bPos);
        if (aDis<bDis) {
            return -1;
        }
        if (aDis>bDis) {
            return 1;
        }
        return 0;
    });
    return json;
}
function RouteChange(latlong) {
    var directionsService=new google.maps.DirectionsService();
    distination=new google.maps.LatLng(latlong[0],latlong[1]);
    var request={
        origin: NowPos,
        destination: distination,
        avoidHighways: true,
        avoidTolls: true,
        travelMode: google.maps.DirectionsTravelMode.WALKING
    }
    directionsService.route(request,function (result,status) {
        if (status==google.maps.DirectionsStatus.OK) {
            directionsDisplay[latlong[2]].setMap(null);
            directionsDisplay[latlong[2]].setDirections(result);
            directionsDisplay[latlong[2]].setMap(map);
        } else {
            console.log(i.toString()+status);
        }
    });
}

function EarthQuakeInfoGet2() {
    $.ajax({
        url: 'http://weather.livedoor.com/forecast/rss/earthquake.xml'+"?"+(new Date()).getTime(),
        type: 'GET',
        dataType: 'xml',
        timeout: 2000,
        success: function (xml,status) {
            if (status==='success') {
                try {
                    xml=$.parseXML(xml["responseText"]);
                    var item=$(xml).find('html').find('body').find('rss').find('channel').find('provider').find('provider').children(':nth-child(2)').find('description');
                    var EQinfos=$(xml).find('html').find('body').find('rss').find('channel').find('provider').find('provider').children();
                    for (var i=1;i<EQinfos.length;i++) {
                        if (userAgent.indexOf('rident/7.0')!=-1||userAgent.indexOf('ndroid 4.')!=-1) {
                            EQinfoArrays[EQinfoArrays.length]=EQinfos[i].textContent.split('http')[0];
                            EQURLArrays[EQURLArrays.length]=EQinfos[i].textContent.split('http')[1].split('r=rss')[0]+'r=rss';
                        } else {
                            EQinfoArrays[EQinfoArrays.length]=EQinfos[i].innerHTML.split('http')[0];
                            EQURLArrays[EQURLArrays.length]=EQinfos[i].innerHTML.split('http')[1].split('r=rss')[0]+'r=rss';
                        }
                    }
                    var EQinfoURL=$(xml).find('html').find('body').find('rss').find('channel').find('provider').find('provider').children(':nth-child(2)')[0];
                    if (userAgent.indexOf('rident/7.0')!=-1||userAgent.indexOf('ndroid 4.')!=-1) {
                        EQinfoURL='http'+EQinfoURL.textContent.split('http')[1].split('r=rss')[0]+'r=rss';
                    } else {
                        EQinfoURL='http'+EQinfoURL.innerHTML.split('http')[1].split('r=rss')[0]+'r=rss';
                    }

                    var infobar=document.getElementById("EQInfo");
                    if (userAgent.indexOf('rident/7.0')!=-1||userAgent.indexOf('ndroid 4.')!=-1) {
                        infobar.textContent=item[0].textContent;
                    } else {
                        infobar.textContent=item[0].innerHTML;
                    }
                } catch (e) {
                    alert("地震情報エラー:"+e.toString());
                }
            } else {
                alert("地震情報エラー:"+status);
            }
            EarthQuakeInfoWidth();
            EarthQuakeInfoMove();
            $.ajax({
                url: EQinfoURL,
                type: "GET",
            }).done(function (res) {
                var Info=res.results[0];
                Info=Info.split('<!--= /image =-->')[1]
                Info=Info.split('<!--= /comment =-->')[0]
                Info=Info.replace('<h3>','<h3 style="text-align:center">');
                Info=Info.replace('<!--= sindo table =-->','');
                Info=Info.replace(/width="640"/g,'width="90%"');
                Info=Info.replace(/style="/g,'style="text-align: center;');


                $('#modalEQ').append(Info+'<div style="text-align: center;">Copyright &copy;<a href="http://www.tenki.jp">日本気象協会</a>　&copy;<a href="http://weather.livedoor.com/weather_hacks/rss_feed_list">livedoor天気情報</a> All rights reserved.</p></div>');
                $('#modalEQ').append('<div style="text-align: center;"><select class="form-control" onchange="EQDataChange(this)" id="EQSelection"></select></div>');
                for (var i=0;i<EQinfoArrays.length;i++) {
                    var j=EQinfoArrays[i].replace(' [ 最大震度 ] ',',');
                    j=j.replace(' [ 震源地 ] ',',');
                    $('#EQSelection').append('<option id="EQ'+i+'">'+j+'</option>');
                    document.getElementById('EQ'+i).setAttribute('data-EQURL',EQURLArrays[i]);
                }
            });
        },
        error: function (err) {
            alert("地震情報エラー:"+err.statusText);
        }
    });
}
function EarthQuakeInfoCheck(str) {
    if (str=="") {
        return -1;
    }
    var infos=str.split(/\r\n|\r|\n/);
    for (var i=infos.length-1;i>=0;i--) {
        if (infos[i].match(/気象庁/)||!infos[i].match(/QUA/)) {
            continue;
        }
        return i;
    }
    return -1;
}

function EarthQuakeInfoWidth() {
    var $txtBox=$("#EQInfo");
    width=getWidth($txtBox);
    if ((window.innerWidth-80)<width) {
        $("#EQInfo").css({ "width": (width).toString()+"px" });
    } else {
        $("#EQInfo").css({ "width": (window.innerWidth-80).toString()+"px" });
    }
}
function EarthQuakeInfoMove() {
    var $txtBox=$("#EQInfo");
    $("#EQInfo").animate({
        left: (-1*(getWidth($txtBox)+50)).toString()+"px"
    },10000,'linear').animate({
        left: "110%"
    },0,'linear')
    setTimeout("EarthQuakeInfoMove()",10000);
}
function getWidth($txt,opt_max) {
    var $body=$(document.body),
    $dummyWrapper=$('<div class="testArea">'),
    $dummy=$('<span class="testText">'),
    width;

    $dummyWrapper.css({
        position: 'absolute',
        top: 0,left: 0,
        width: opt_max||9999,
        'z-index': -1
    });

    $dummy.text($txt.text());
    $dummy.css({
        color: 'transparent',
        'letter-spacing': $txt.css('letter-spacing')
    });

    $body.append($dummyWrapper.append($dummy));

    width=$dummy.width();

    setTimeout(function () {
        $dummyWrapper.remove();
    },0);

    return width;
}

function Scheme() {
    if (userAgent.indexOf('iPhone')>-1) {
        var scheme='comgooglemaps-x-callback://?saddr='+NowPos.lat()+','+NowPos.lng()+'&daddr='+distination.lat()+','+distination.lng()+'&directionsmode=walking';
        window.location.href=scheme;
    } else {
        var scheme='http://maps.google.com?saddr='+NowPos.lat()+','+NowPos.lng()+'&daddr='+distination.lat()+','+distination.lng()+'&directionsmode=walking';
        window.location.href=scheme;
    }
}

//GoogleAnalytics
(function (i,s,o,g,r,a,m) {
    i['GoogleAnalyticsObject']=r; i[r]=i[r]||function () {
        (i[r].q=i[r].q||[]).push(arguments)
    },i[r].l=1*new Date(); a=s.createElement(o),
    m=s.getElementsByTagName(o)[0]; a.async=1; a.src=g; m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create','UA-51356556-7','auto');
ga('send','pageview');