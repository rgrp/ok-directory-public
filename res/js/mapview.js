
/*
 Geocoding
 ----------------------*/

var map;
var layerGroup;
var markers;
var fetchedAddresses = new Object();
var mapQuestApiKey = "Fmjtd|luur206a20%2Cbn%3Do5-9at004"; // Open Steps APIKey, change please
var geocodeApiURL="http://www.mapquestapi.com/geocoding/v1/address?key="+mapQuestApiKey+"&country=#country#&city=#city#";
var currentArticle = undefined;
var initializeMap = function() {

  // Init Map
  map = L.map('map').setView([13.4061, 52.5192], 1);
        mapLink =
            '<a href="http://openstreetmap.org">OpenStreetMap</a>';
        L.tileLayer(
            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; ' + mapLink,
            maxZoom: 8,
            }).addTo(map);

  markers = new L.MarkerClusterGroup({showCoverageOnHover: false});

  map.addLayer(markers);

  // Disable wheel zoom
  map.scrollWheelZoom.disable();

}

// Calls the geocoding webservice for an article and adds the marker on the map when found. If it is the last one, set the map bounds so all markers are visible.
var codeAddressFromArticle = function(context,article,last) {

	var addressToGeocode = article["address"]["country"]+', '+article["address"]["city"];

	// Setup marker icon
	var imgIcon = L.icon({
	    iconUrl: 'res/img/dot.png',
	    //shadowUrl: 'res/img/avatar_bg.png',

	    iconSize:     [16, 16], // size of the icon
	    //shadowSize:   [34, 34], // size of the shadow
	    iconAnchor:   [8,8], // point of the icon which will correspond to marker's location
	    //shadowAnchor: [1,1],  // the same for the shadow
	    popupAnchor:  [16,0] // point from which the popup should open relative to the iconAnchor
	});

	// If the address was not already fetched, do it
	if (!fetchedAddresses[addressToGeocode]){

		// replace placeholders in the url
		var finalGeocodeApiURL = geocodeApiURL.replace('#city#',article["address"]["city"]);
		finalGeocodeApiURL = finalGeocodeApiURL.replace('#country#',article["address"]["country"]);

		//console.log("Fetching address on: "+finalGeocodeApiURL);

		$.getJSON( finalGeocodeApiURL, function( data ) {

			if (data.info.statuscode == 0) {

				// Store fetched address
				fetchedAddresses[addressToGeocode] = data.results[0].locations[0].latLng.lat+","+data.results[0].locations[0].latLng.lng;

				// Add marker
				var marker = new L.marker(new L.latLng(data.results[0].locations[0].latLng.lat,data.results[0].locations[0].latLng.lng),{icon: imgIcon});
				setupMarkerWithArticle(context,marker,article,last);
			}

		});

	}else{

		// Extract coordinates from map
		var latLng = fetchedAddresses[addressToGeocode].split(",");
		var marker = new L.marker(new L.latLng(latLng[0],latLng[1]),{icon: imgIcon});
		setupMarkerWithArticle(context,marker,article,last);

	}

}

// Moves the centre of the map to the position of an article
var panMapToArticle = function(context,article){

	var addressToGeocode = article["address"]["country"]+', '+article["address"]["city"];

	// If the address was not already fetched, do it
	if (!fetchedAddresses[addressToGeocode]){

		// replace placeholders in the url
		var finalGeocodeApiURL = geocodeApiURL.replace('#city#',article["address"]["city"]);
		finalGeocodeApiURL = finalGeocodeApiURL.replace('#country#',article["address"]["country"]);

		//console.log("Fetching address on: "+finalGeocodeApiURL);

		$.getJSON( finalGeocodeApiURL, function( data ) {

			if (data.info.statuscode == 0) {

				// Store fetched address
				fetchedAddresses[addressToGeocode] = data.results[0].locations[0].latLng.lat+","+data.results[0].locations[0].latLng.lng;

				map.panTo(new L.latLng(data.results[0].locations[0].latLng.lat,data.results[0].locations[0].latLng.lng));
				//map.setZoom(6);
			}

		});

	}else{

		// Extract coordinates from map
		var latLng = fetchedAddresses[addressToGeocode].split(",");

		map.panTo(new L.latLng(latLng[0],latLng[1]));
		//map.setZoom(6);

	}

}

// Utility method to bind the popup of the marker and add it to the layer.
var setupMarkerWithArticle = function(context,marker,article,last){

	//marker.bindPopup(context._renderArticlePopupHtml(article));

	marker.on('mouseover', function (a) {

    	$('#details').html(context._renderArticlePopupHtml(article));

 	});

 	/*marker.on('click', function (a) {

    	if (currentArticle){
    		currentArticle = undefined;
    	}else{
    		currentArticle = article;
    	}

    	refreshDetails();
 	});*/

 	marker.on('mouseout', function (a) {

    	//$('#details').html("<img src=\"res/img/avatar_placeholder.png\"/>");

 	});

 	markers.addLayer(marker);

 	if (last){
 		mapFitBounds();
 	}

}

var mapFitBounds = function(){

	map.fitBounds(markers.getBounds(),{padding: [50,50]});

}

/*--------------------
  HELPERS
--------------------*/

var clearLayers = function(){

  //layerGroup.clearLayers();
  markers.clearLayers();

};

