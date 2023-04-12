//provide access token to Mapbox API 
mapboxgl.accessToken = 'pk.eyJ1IjoiaXJlbyIsImEiOiJjbGRtMTVrbGkwNHh5M3B0Yjd5YnF3cHNvIn0.KNtbmsY84dCZpXiXy91keg';

//define maximum and minimum scroll bounds for the maps
const maxBounds = [
  [-82, 42.94], //SW coords
  [-77, 44.87] //NE coords
];

//define a constant variable "map" and assign it to a map created with the Mapbox API 
const map = new mapboxgl.Map({
  container: 'map1', //ID for div where map will be embedded in HTML file
  style: 'mapbox://styles/ireo/clfvlsqn800m701mxbykznqv5',//'mapbox://styles/mapbox/light-v11', //link to style URL
  center: [-79.266, 43.926], //starting position [longitude, latitude]
  zoom: 8.65, //starting zoom
  bearing: -17.7, //angle rotation of map
  maxBounds: maxBounds //maximum and minimum scroll bounds
});

//Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

//Add fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());

//Create geocoder variable
const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  countries: "ca"
});


//Add interactivity based on HTML event
//Use geocoder div to position geocoder on page
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

isProcessing = false


// Create empty GeoJSON objects to hold point features
let geojson = {
  'type': 'FeatureCollection',
  'features': []
};

buffresult = {
  "type": "FeatureCollection",
  "features": []
};

var divs_lons = []
var divs_lats = []

var weather_test = [];
let polygon

//Add data sources and draw map layers
map.on('load', () => {
  //'getJSON' function for reading an external JSON file
  var getJSON = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
  };
  //apply 'getJSON' function to our external JSON file from BikeShare API: if it reads the file successfully, trigger 'updateMap' function, otherwise give an error
  getJSON('https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information',
    function (err, data) {
      if (err !== null) {
        alert('Something went wrong: ' + err);
      } else {
        updateMap(data)
      }
    });

  //'updateMap' function for taking the coordinates out of the BikeShare JSON file, using them to manually create a GeoJSON file, and then plotting the points in this created GeoJSON file 
  function updateMap(data) {

    test = []; //var
    //loop through all of the BikeShare stations and add their coordinates to a manually created GeoJSON file
    for (let step = 0; step < data.data.stations.length; step++) {
      let longitude = data.data.stations[step].lon
      let latitude = data.data.stations[step].lat
      let name = data.data.stations[step].name
      let station_id = data.data.stations[step].station_id
      let address = data.data.stations[step].address
      let post_code = data.data.stations[step].post_code
      test.push(JSON.parse(`{"type": "Feature", "geometry": {"coordinates": [${longitude},${latitude}], "type": "Point"}, "properties": {"name":"${name}", "station_id":"${station_id}", "address":"${address}", "post_code":"${post_code}"}}`));
    };

    //add a geojson file source "toronto_bikeshare_stations" for Toronto bikeways using the manually created GeoJSON file
    map.addSource('toronto_bikeshare_stations', {
      type: 'geojson',
      data: {
        "type": "FeatureCollection",
        "features": test
      },
      //cluster the data to limit the symbology on the map at low zoom levels
      cluster: true,
      clusterMaxZoom: 14, //maximum zoom at which points cluster
      clusterRadius: 50 //distance over which points cluster
    });

    //load and add image 'bikeshare-marker' for bikeshare icons (throw an error if this process fails)
    map.loadImage(
      'https://ireo00.github.io/GTAccesstoCycling/Data/bikeshare.png',
      (error, image) => {
        if (error) throw error;
        map.addImage('bikeshare-marker', image);
      }
    );

    //add and style a layer of lines "toronto_bikeshare_clustered" from the defined "toroto_bikeshare_stations" source for the clustered bikeshare stations
    map.addLayer({
      'id': 'toronto_bikeshare_clustered',
      'type': 'circle',
      'source': 'toronto_bikeshare_stations',
      //only show text when there is more than 1 bikeshare station within radius 
      filter: ['has', 'point_count'],
      'paint': {
        //specify the radius of the circles based on whether the number of bikeshare stations within radius is <10, 10-20, 20-50, 50-100 or >100
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          13,
          10,
          15,
          20,
          17,
          50,
          20,
          100,
          25
        ],
        'circle-color': '#147453'
      }
    });

    //add and style a layer of symbols "toronto_bikeshare_cluster_count" from the defined "toronto_bikeshare_stations" source for the text on top of the clustered bikeshare stations
    map.addLayer({
      id: 'toronto_bikeshare_cluster_count',
      type: 'symbol',
      source: 'toronto_bikeshare_stations',
      //only show text when there is more than 1 bikeshare station within radius 
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        //allow overlap of other text layers (so that all layers are simultaneously visible)
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': 'white'
      },
    });

    //add and style a layer of circles "toronto_bikeshare_unclustered" from the defined "toronto_bikeshare_stations" source for the unclustered (single) bikeshare stations
    map.addLayer({
      id: 'toronto_bikeshare_unclustered',
      type: 'symbol',
      source: 'toronto_bikeshare_stations',
      //only show circles when there is 1 bikeshare station within radius 
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': 'bikeshare-marker',
        'icon-size': 0.09,
        //allow overlap of other icon layers (so that all layers are simultaneously visible)
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });



  }

  map.on('mouseenter', 'toronto_bikeshare_unclustered', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'toronto_bikeshare_unclustered', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'toronto_bikeshare_unclustered', (e) => {
    let station_id=e.features[0].properties.station_id
    let name=e.features[0].properties.name
    let address=e.features[0].properties.address
    let post_code=e.features[0].properties.post_code
    fetch('https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status')
      .then(response => response.json())
      .then(response => {
        bikeshare_status = response;
        bikeshare_status.data.stations.forEach((station) => {

          if (station.station_id === station_id) {
            console.log(station.station_id)
            if (post_code!="undefined"){
            new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("<b>Name:</b> " + name + "<br>" + "<b>Address:</b> " + address + "<br>" + "<b>Postal Code:</b> " + post_code + "<br>" + "<b>No. Available Bikes:</b> " + station.num_bikes_available + "<br>" + "<b>No. Available Docks:</b> " + station.num_docks_available)
              .addTo(map);
            }
            else if (post_code=="undefined") {
              new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML("<b>Name:</b> " + name + "<br>" + "<b>Address:</b> " + address + "<br>" + "<b>No. Available Bikes:</b> " + station.num_bikes_available + "<br>" + "<b>No. Available Docks:</b> " + station.num_docks_available)
                .addTo(map);
              }
          }
        })
      })
  });

  //add a geojson file source "toronto_cycling_network" for Toronto bikeways
  map.addSource('toronto_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/toronto_cycling_network.geojson',
    'generateId': true
  });

  //add and style a layer of lines "toronto_bikeways" from the defined "toronto_cycling_network" source
  map.addLayer({
    'id': 'toronto_bikeways',
    'type': 'line',
    'source': 'toronto_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        '#FC6468', //5EBD3E, CC79A7
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900', //FFB900
        ['any', ['in', 'multi', ['downcase', ['get', 'type']]], ['in', 'shared pathway', ['downcase', ['get', 'type']]]],
        '#0072B2', //009CDF
        ['any', ['in', 'sharrows', ['downcase', ['get', 'type']]], ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        '#8B4DAB', //E23838, 56B4E9
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#009E73', //973999
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#C11F73', //F78200
        'black'
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  map.on('mouseenter', 'toronto_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'toronto_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'toronto_bikeways', (e) => {
    console.log(e)

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" + "<b>Facility 1:</b> " + e.features[0].properties.type +  "<br>" + "<b>Classification:</b> " + e.features[0].properties.Classification
      + "<br>" + "<b>Facility 2:</b> " + e.features[0].properties.secondary_type) //if statement
        .addTo(map);
  });

  let toronto_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'toronto_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (toronto_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'toronto_cycling_network', id: toronto_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
            toronto_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'toronto_cycling_network', id: toronto_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'toronto_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (toronto_bikeID !== null) {
            map.setFeatureState(
                { source: 'toronto_cycling_network', id: toronto_bikeID },
                { hover: false }
            );
        }
        toronto_bikeID = null;
    });   


  //add a geojson file source "york_region_cycling_network" for York Region bikeways
  map.addSource('york_region_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/york_region_cycling_network.geojson',
    'generateId': true
  });

  //add and style a layer of lines "york_region_bikeways" from the defined "york_region_cycling_network" source
  map.addLayer({
    'id': 'york_region_bikeways',
    'type': 'line',
    'source': 'york_region_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        '#FC6468',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900',
        ['any', ['in', 'multi', ['downcase', ['get', 'type']]]],
        '#0072B2',
        ['any', ['in', 'sharrows', ['downcase', ['get', 'type']]], ['in', 'shared pathway', ['downcase', ['get', 'type']]], ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        '#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#009E73',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#C11F73',
        'black'
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  let york_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'york_region_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (york_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'york_region_cycling_network', id: york_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
            york_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'york_region_cycling_network', id: york_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'york_region_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (york_bikeID !== null) {
            map.setFeatureState(
                { source: 'york_region_cycling_network', id: york_bikeID },
                { hover: false }
            );
        }
        york_bikeID = null;
    });   


  map.on('mouseenter', 'york_region_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'york_region_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'york_region_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" + "<b>Facility:</b> " + e.features[0].properties.type + "<br>" + "<b>Classification:</b> " + e.features[0].properties.Classification +
    "<br>" + "<b>Surface:</b> " + e.features[0].properties.surface + "<br>" + "<b>Municipality:</b> " +  e.features[0].properties.municipality ) //if statement needed for "systems"
      .addTo(map);
  });

  //add a geojson file source "peel_region_cycling_network" for Peel Region bikeways
  map.addSource('peel_region_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/peel_region_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "peel_bikeways" from the defined "peel_region_cycling_network" source
  map.addLayer({
    'id': 'peel_bikeways',
    'type': 'line',
    'source': 'peel_region_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bicycle lane', ['downcase', ['get', 'Type']]],
        '#FC6468',
        ['in', 'multi', ['downcase', ['get', 'Type']]],
        '#0072B2',
        ['any', ['in', 'marked', ['downcase', ['get', 'Type']]], ['in', 'shared pathway', ['downcase', ['get', 'Type']]],['in', 'connection', ['downcase', ['get', 'Type']]], ['in', 'shared roadway', ['downcase', ['get', 'Type']]], ['in', 'signed route', ['downcase', ['get', 'Type']]]],//marked on road bike route? on road connection?
        '#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'Type']]], ['in', 'dirt', ['downcase', ['get', 'Type']]]],
        '#009E73',
        ['in', 'paved shoulder', ['downcase', ['get', 'Type']]],
        '#C11F73',
        'black' //default color if none of the above apply
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  map.on('mouseenter', 'peel_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'peel_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'peel_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Name:</b> " + e.features[0].properties.Name + "<br>" + "<b>Facility:</b> " + e.features[0].properties.Type + "<br>" + "<b>Classification:</b> " +  e.features[0].properties.Classification +
      "<br>" + "<b>Surface:</b> " + e.features[0].properties.Surface + "<br>" + "<b>Municipality:</b> " +  e.features[0].properties.Municipality) //if statement needed
        .addTo(map);
  });

  let peel_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'peel_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (peel_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'peel_region_cycling_network', id: peel_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
            peel_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'peel_region_cycling_network', id: peel_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'peel_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (peel_bikeID !== null) {
            map.setFeatureState(
                { source: 'peel_region_cycling_network', id: peel_bikeID },
                { hover: false }
            );
        }
        peel_bikeID = null;
    }); 

  //add a geojson file source "durham_region_cycling_network" for Durham Region bikeways
  map.addSource('durham_region_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/durham_region_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "durham_region_bikeways" from the defined "durham_region_cycling_network" source
  map.addLayer({
    'id': 'durham_region_bikeways',
    'type': 'line',
    'source': 'durham_region_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        '#FC6468',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900',
        ['any', ['in', 'multi', ['downcase', ['get', 'type']]], ['in', 'shared pathway', ['downcase', ['get', 'type']]]],
        '#0072B2',
        ['any', ['in', 'sharrows', ['downcase', ['get', 'type']]], ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        '#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#009E73',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#C11F73',
        'black'
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  map.on('mouseenter', 'durham_region_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'durham_region_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'durham_region_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Name:</b> "+ e.features[0].properties.Name + "<br>" + "<b>Classification:</b> " + e.features[0].properties.classification)
        .addTo(map);
  });
  
  let durham_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'durham_region_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (durham_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'durham_region_cycling_network', id: durham_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
            durham_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'durham_region_cycling_network', id: durham_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'durham_region_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (durham_bikeID !== null) {
            map.setFeatureState(
                { source: 'durham_region_cycling_network', id: durham_bikeID },
                { hover: false }
            );
        }
        durham_bikeID = null;
    }); 
  //add a geojson file source "burlington_cycling_networkk" for Burlington bikeways
  map.addSource('burlington_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/burlington_cycling_network.geojson', 'generateId': true
  });
  map.addLayer({
    'id': 'burlington_bikeways',
    'type': 'line',
    'source': 'burlington_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bl', ['downcase', ['get', 'type']]], //'bike lane', Bike lane (BL)
        '#FC6468',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900',
        ['any', ['in', 'mupoff', ['downcase', ['get', 'type']]], ['in', 'mupadj', ['downcase', ['get', 'type']]], ['in', 'bl-shared', ['downcase', ['get', 'type']]]], //'multi', Multiuse path off road (MUPOFF) OR Multiuse path adjacent to road	(MUPADJ)
        '#0072B2',
        ['in', 'shared', ['downcase', ['get', 'type']]], //'sharrows', Shared use - Sharrows painted on pavement (SHARED)
        '#8B4DAB',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        //['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        //'#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#009E73',
        // ['in', 'bl-shared', ['downcase', ['get', 'type']]], // 'shared pathway', Mixed use - Bike lane and sharrows (BL-SHARED) 
        // '#ff69b4',
        ['in', 'ps', ['downcase', ['get', 'type']]], //'paved shoulder', Paved shoulder (PS)
        '#C11F73',
        'black' //default color if none of the above apply
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]


    }
  });

  map.on('mouseenter', 'burlington_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'burlington_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'burlington_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Street Name:</b> " + e.features[0].properties.street_name + "<br>" + "<b>Facility:</b> " + e.features[0].properties.type + "<br>" + "<b>Classification:</b> " + e.features[0].properties.Classification)
        .addTo(map);
  });

  let burlington_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'burlington_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (burlington_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'burlington_cycling_network', id: burlington_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
           burlington_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'burlington_cycling_network', id: burlington_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'burlington_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (burlington_bikeID !== null) {
            map.setFeatureState(
                { source: 'burlington_cycling_network', id: burlington_bikeID },
                { hover: false }
            );
        }
        burlington_bikeID = null;
    }); 

  //add a geojson file source "milton_cycling_network" for Milton bikeways
  map.addSource('milton_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/milton_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "milton_bikeways" from the defined "milton_cycling_network" source
  map.addLayer({
    'id': 'milton_bikeways',
    'type': 'line',
    'source': 'milton_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        '#FC6468',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900',
        ['any', ['in', 'multi', ['downcase', ['get', 'type']]], ['in', 'shared pathway', ['downcase', ['get', 'type']]]],
        '#0072B2',
        ['any', ['in', 'sharrows', ['downcase', ['get', 'type']]], ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]], ['in', 'shared facility', ['downcase', ['get', 'type']]]] ,
        '#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#009E73',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#C11F73',
        'black'
      ],
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  map.on('mouseenter', 'milton_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'milton_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'milton_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Facility:</b> " +  e.features[0].properties.type + "<br>" + "<b>Classification:</b> " + e.features[0].properties.classification + "<br>" + "<b>Surface:</b> "  + e.features[0].properties.surface)
        .addTo(map);
  });

  let milton_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'milton_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (milton_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'milton_cycling_network', id: milton_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
           milton_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'milton_cycling_network', id: milton_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'milton_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (milton_bikeID !== null) {
            map.setFeatureState(
                { source: 'milton_cycling_network', id: milton_bikeID },
                { hover: false }
            );
        }
        milton_bikeID = null;
    }); 
  //add a geojson file source "oakville_cycling_network" for Oakville bikeways
  map.addSource('oakville_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/oakville_cycling_network.geojson' , 'generateId': true
  });

  //add and style a layer of lines "oakville_bikeways" from the defined "oakville_cycling_network" source
  map.addLayer({
    'id': 'oakvill_bikeways',
    'type': 'line',
    'source': 'oakville_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['==', 1, ['get', 'type']],
        '#FC6468',
        ['==', 2, ['get', 'type']],
        '#0072B2',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['==', 3, ['get', 'type']],
        '#8B4DAB',
        ['==', 4, ['get', 'type']],
        '#C11F73',
        ['==', 6, ['get', 'type']],
        '#8B4DAB',
        'black' //default color if none of the above apply
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  map.on('mouseenter', 'oakvill_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'oakvill_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'oakvill_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Facility:</b> " + e.features[0].properties.type + "<br>" + "<b>Classification:</b> "  + e.features[0].properties.Classification + "<br>" + "<b>Surface:</b> "  + e.features[0].properties.surface)
        .addTo(map);
  });

  let oakville_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'oakvill_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (oakville_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'oakville_cycling_network', id: oakville_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
           oakville_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'oakville_cycling_network', id: oakville_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'oakvill_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (oakville_bikeID !== null) {
            map.setFeatureState(
                { source: 'oakville_cycling_network', id: oakville_bikeID },
                { hover: false }
            );
        }
        oakville_bikeID = null;
    }); 
  //add a geojson file source "toronto_bicycle_parking" for Toronto bike parking stations
  map.addSource('toronto_bicycle_parking', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/toronto_bicycle_parking.geojson',
    'generateId': true,
    //cluster the data to limit the symbology on the map at low zoom levels
    cluster: true,
    clusterMaxZoom: 14, //maximum zoom at which points cluster
    clusterRadius: 50 //distance over which points cluster
  });

  //load and add image 'parking-marker' for parking icons (throw an error if this process fails)
  map.loadImage(
    'https://ireo00.github.io/GTAccesstoCycling/Data/bicycle-parking.png',
    (error, image) => {
      if (error) throw error;
      map.addImage('parking-marker', image);
    }
  );

  //add and style a layer of circles "toronto_bike_parking_clustered" from the defined "toronto_bicycle_parking" source for the clustered parking stations
  map.addLayer({
    'id': 'toronto_bike_parking_clustered',
    'type': 'circle',
    'source': 'toronto_bicycle_parking',
    //only show circles when there is more than 1 bike parking station within radius
    filter: ['has', 'point_count'],
    'paint': {
      'circle-color': '#84BCE4',
      //specify the radius of the circles based on whether the number of bike parking stations within radius is <10, 10-20, 20-50, 50-100 or >100
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        10,
        15,
        20,
        17,
        50,
        20,
        100,
        25
      ]
    }
  });

  //add and style a layer of symbols "toronto_bike_parking_cluster_count" from the defined "toronto_bicycle_parking" source for the text on top of the clustered parking stations
  map.addLayer({
    id: 'toronto_bike_parking_cluster_count',
    type: 'symbol',
    source: 'toronto_bicycle_parking',
    //only show text when there is more than 1 bike parking station within radius 
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      //allow overlap of other text layers (so that all layers are simultaneously visible)
      'text-allow-overlap': true,
      'text-ignore-placement': true
    }
  });

  //add and style a layer of circles "toronto_bike_parking_unclustered" from the defined "toronto_bicycle_parking" source for the unclustered (single) parking stations
  map.addLayer({
    id: 'toronto_bike_parking_unclustered',
    type: 'symbol',
    source: 'toronto_bicycle_parking',
    //only show circles when there is 1 bike parking station within radius 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'parking-marker',
      'icon-size': 0.15,
      //allow overlap of other icon layers (so that all layers are simultaneously visible)
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });

  map.on('mouseenter', 'toronto_bike_parking_unclustered', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'toronto_bike_parking_unclustered', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'toronto_bike_parking_unclustered', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" + "<b>Address:</b> " + e.features[0].properties.address + "<br>" + "<b>Postal Code:</b> "
      + e.features[0].properties.postal_code + "<br>" + "<b>Ward:</b> " + e.features[0].properties.ward + "<br>" + "<b>City:</b>  " + e.features[0].properties.city + "<br>" + "<b>Parking Type:</b>  " + e.features[0].properties.parking_type + "<br>" +       
      "<b>Capacity:</b> " + e.features[0].properties.bike_capacity)
        .addTo(map);
  });

  
  // //add a geojson file source "toronto_bicycle_parking" for Toronto bike parking stations
  // map.addSource('gta_bicycle_parking', {
  //   type: 'geojson',
  //   data: 'https://ireo00.github.io/GTAccesstoCycling/Data/gta_bicycle_parking.geojson',
  //   'generateId': true,
  //   //cluster the data to limit the symbology on the map at low zoom levels
  //   cluster: true,
  //   clusterMaxZoom: 14, //maximum zoom at which points cluster
  //   clusterRadius: 50 //distance over which points cluster
  // });

  // //add and style a layer of circles "toronto_bike_parking_clustered" from the defined "toronto_bicycle_parking" source for the clustered parking stations
  // map.addLayer({
  //   'id': 'gta_bike_parking_clustered',
  //   'type': 'circle',
  //   'source': 'gta_bicycle_parking',
  //   //only show circles when there is more than 1 bike parking station within radius
  //   filter: ['has', 'point_count'],
  //   'paint': {
  //     'circle-color': '#84BCE4',
  //     //specify the radius of the circles based on whether the number of bike parking stations within radius is <10, 10-20, 20-50, 50-100 or >100
  //     'circle-radius': [
  //       'step',
  //       ['get', 'point_count'],
  //       13,
  //       10,
  //       15,
  //       20,
  //       17,
  //       50,
  //       20,
  //       100,
  //       25
  //     ]
  //   }
  // });

  // //add and style a layer of symbols "toronto_bike_parking_cluster_count" from the defined "toronto_bicycle_parking" source for the text on top of the clustered parking stations
  // map.addLayer({
  //   id: 'gta_bike_parking_cluster_count',
  //   type: 'symbol',
  //   source: 'gta_bicycle_parking',
  //   //only show text when there is more than 1 bike parking station within radius 
  //   filter: ['has', 'point_count'],
  //   layout: {
  //     'text-field': ['get', 'point_count_abbreviated'],
  //     'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
  //     'text-size': 12,
  //     //allow overlap of other text layers (so that all layers are simultaneously visible)
  //     'text-allow-overlap': true,
  //     'text-ignore-placement': true
  //   }
  // });

  // //add and style a layer of circles "toronto_bike_parking_unclustered" from the defined "toronto_bicycle_parking" source for the unclustered (single) parking stations
  // map.addLayer({
  //   id: 'gta_bike_parking_unclustered',
  //   type: 'symbol',
  //   source: 'gta_bicycle_parking',
  //   //only show circles when there is 1 bike parking station within radius 
  //   filter: ['!', ['has', 'point_count']],
  //   layout: {
  //     'icon-image': 'parking-marker',
  //     'icon-size': 0.13,
  //     //allow overlap of other icon layers (so that all layers are simultaneously visible)
  //     'icon-allow-overlap': true,
  //     'icon-ignore-placement': true
  //   }
  // });
  //add a geojson file source "toronto_bicycle_shops" for Toronto bike shops
  map.addSource('toronto_bicycle_shops', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/toronto_bicycle_shops.geojson',
    'generateId': true,
    //cluster the data to limit the symbology on the map at low zoom levels
    cluster: true,
    clusterMaxZoom: 14, //maximum zoom at which points cluster
    clusterRadius: 50 //distance over which points cluster
  });

  //load and add image 'shop-marker' for shop icons (throw an error if this process fails)
  map.loadImage(
    'https://ireo00.github.io/GTAccesstoCycling/Data/bicycle-shop.png',
    (error, image) => {
      if (error) throw error;
      map.addImage('shop-marker', image);
    }
  );


  //add and style a layer of circles "toronto_bicycle_shops_clustered" from the defined "toronto_bicycle_shops" source for the clustered bike shops
  map.addLayer({
    'id': 'toronto_bicycle_shop_clustered',
    'type': 'circle',
    'source': 'toronto_bicycle_shops',
    //only show circles when there is more than 1 bike shop within radius
    filter: ['has', 'point_count'],
    'paint': {
      'circle-color': '#AC1C54',
      //specify the radius of the circles based on whether the number of bike shops within radius is <10, 10-20, 20-50, 50-100 or >100
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        10,
        15,
        20,
        17,
        50,
        20,
        100,
        25
      ]
    }
  });

  //add and style a layer of symbols "toronto_bicycle_shops_cluster_count" from the defined "toronto_bicycle_shops" source for the text on top of the clustered bike shops
  map.addLayer({
    id: 'toronto_bicycle_shop_clustered_count',
    type: 'symbol',
    source: 'toronto_bicycle_shops',
    //only show text when there is more than 1 bike shop within radius 
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      //allow overlap of other text layers (so that all layers are simultaneously visible)
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': 'white'
    },
  });

  //add and style a layer of circles "toronto_bicycle_shop_unclustered" from the defined "toronto_bicycle_shops" source for the unclustered (single) shop
  map.addLayer({
    id: 'toronto_bicycle_shop_unclustered',
    type: 'symbol',
    source: 'toronto_bicycle_shops',
    //only show circles when there is 1 bike shop within radius 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'shop-marker',
      'icon-size': 0.09,
      //allow overlap of other icon layers (so that all layers are simultaneously visible)
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });

    //Hover and pop-up
    map.on('mouseenter', 'toronto_bicycle_shop_unclustered', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
  
    map.on('mouseleave', 'toronto_bicycle_shop_unclustered', () => {
      map.getCanvas().style.cursor = '';
    });
  
    map.on('click', 'toronto_bicycle_shop_unclustered', (e) => {
      console.log(e)
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" + "<b>Address:</b> " + e.features[0].properties.address + "<br>" + "<b>Postal Code:</b> "
        + e.features[0].properties.postal_code + "<br>" + "<b>Ward:</b> " + e.features[0].properties.ward + "<br>" +  "<b>Unit No:</b>  " + e.features[0].properties.unit + "<br>" + "<b>City:</b>  " + e.features[0].properties.city + "<br>" + "<b>Phone:</b>  " + e.features[0].properties.phone + "<br>" +       
        "<b>Email:</b> " + e.features[0].properties.email + "<br>" + "<b>Rentals?:</b> " + e.features[0].properties.rental)
          .addTo(map);
    });


  


  map.addSource('ajax_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/ajax_cycling_network.geojson',
    'generateId': true,
  });

  map.addLayer({
    'id': 'ajax_bikeways',
    'type': 'line',
    'source': 'ajax_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['any', ['in', 'bike lane', ['downcase', ['get', 'type']]],['in', 'bicycle priority', ['downcase', ['get', 'type']]]],
        '#FC6468',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900',
        ['any', ['in', 'multi', ['downcase', ['get', 'type']]], ['in', 'shared pathway', ['downcase', ['get', 'type']]]],
        '#0072B2',
        ['any', ['in', 'sharrows', ['downcase', ['get', 'type']]], ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]], ['in', 'shared facility', ['downcase', ['get', 'type']]]] ,
        '#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]], ['in', 'off-road', ['downcase', ['get', 'type']]]],
        '#009E73',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#C11F73',
        'black'
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  //Hover and pop-up
  map.on('mouseenter', 'ajax_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'ajax_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'ajax_bikeways', (e) => {
    console.log(e.features[0].properties.location.split(":"))
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Facility:</b> " + e.features[0].properties.type + "<br>" + "<b>Classification:</b> " + e.features[0].properties.classification + "<br>" + "<b>Street:</b> " + (e.features[0].properties.location).substring(0, (e.features[0].properties.location).length-9))
        .addTo(map);
  });

  let ajax_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'ajax_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (ajax_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'ajax_cycling_network', id: ajax_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
           ajax_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'ajax_cycling_network', id: ajax_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'ajax_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (ajax_bikeID !== null) {
            map.setFeatureState(
                { source: 'ajax_cycling_network', id: ajax_bikeID },
                { hover: false }
            );
        }
        ajax_bikeID = null;
    }); 
  map.addSource('whitby_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/whitby_cycling_network.geojson',
    'generateId': true,
  });

  map.addLayer({
    'id': 'whitby_bikeways',
    'type': 'line',
    'source': 'whitby_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['any', ['in', 'bike lane', ['downcase', ['get', 'type']]], ['in', 'bike route', ['downcase', ['get', 'type']]]],
        '#FC6468',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        '#FFB900',
        ['any', ['in', 'multi', ['downcase', ['get', 'type']]], ['in', 'shared pathway', ['downcase', ['get', 'type']]]],
        '#0072B2',
        ['any', ['in', 'sharrows', ['downcase', ['get', 'type']]], ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]] ,
        '#8B4DAB',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#009E73',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#C11F73',
        'black'
      ],
      //'line-opacity': 0.7
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, //change opacity of lines to 1 when hovered over
        0.5 //leave opacity of lines at 0.5 when not hovered over
    ]
    }
  });

  //Hover and pop-up
  map.on('mouseenter', 'whitby_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'whitby_bikeways', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'whitby_bikeways', (e) => {
    console.log(e)
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Facility:</b> " + e.features[0].properties.type + "<br>" + "<b>Classification:</b> " + e.features[0].properties.classification + "<br>" + "<b>Street Name:</b> " + e.features[0].properties['road name'])
        .addTo(map);
  });

  let whitby_bikeID = null; //assign initial value of 'bikeID' variable as null

    //specify events triggered by moving mouse over the 'bike' layer
    map.on('mousemove', 'whitby_bikeways', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'bike' layer
        if (e.features.length > 0) { 
            //if bikeID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset its original opacity (before continuing to move and highlight the next hovered line)
            if (whitby_bikeID !== null) { 
                map.setFeatureState(
                    { source: 'whitby_cycling_network', id: whitby_bikeID },
                    { hover: false }
                );
            }
            //set 'bikeID' variable to the id of the 'bike' layer feature being hovered over
           whitby_bikeID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'bike' layer being hovered over (to change its opacity)
            map.setFeatureState(
                { source: 'whitby_cycling_network', id: whitby_bikeID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'bike' layer
    map.on('mouseleave', 'whitby_bikeways', () => { 
        //change the hover feature-state to "false" for the feature of the 'bike' layer that was previously hovered over (to reset its original opacity) and re-initialize bikeID to null
        if (whitby_bikeID !== null) {
            map.setFeatureState(
                { source: 'whitby_cycling_network', id: whitby_bikeID },
                { hover: false }
            );
        }
        whitby_bikeID = null;
    }); 


  //add a geojson file source "toronto_bicycle_shops" for Toronto bike shops
  map.addSource('gta_bicycle_shops', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/gta_bicycle_shops.geojson',
    'generateId': true,
    //cluster the data to limit the symbology on the map at low zoom levels
    cluster: true,
    clusterMaxZoom: 14, //maximum zoom at which points cluster
    clusterRadius: 50 //distance over which points cluster
  });

  //add and style a layer of circles "toronto_bicycle_shops_clustered" from the defined "toronto_bicycle_shops" source for the clustered bike shops
  map.addLayer({
    'id': 'gta_bicycle_shop_clustered',
    'type': 'circle',
    'source': 'gta_bicycle_shops',
    //only show circles when there is more than 1 bike shop within radius
    filter: ['has', 'point_count'],
    'paint': {
      'circle-color': '#AC1C54',
      //specify the radius of the circles based on whether the number of bike shops within radius is <10, 10-20, 20-50, 50-100 or >100
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        10,
        15,
        20,
        17,
        50,
        20,
        100,
        25
      ]
    }
  });

  //add and style a layer of symbols "toronto_bicycle_shops_cluster_count" from the defined "toronto_bicycle_shops" source for the text on top of the clustered bike shops
  map.addLayer({
    id: 'gta_bicycle_shop_cluster_count',
    type: 'symbol',
    source: 'gta_bicycle_shops',
    //only show text when there is more than 1 bike shop within radius 
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      //allow overlap of other text layers (so that all layers are simultaneously visible)
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': 'white'
    },
  });

  //add and style a layer of circles "toronto_bicycle_shop_unclustered" from the defined "toronto_bicycle_shops" source for the unclustered (single) shop
  map.addLayer({
    id: 'gta_bicycle_shop_unclustered',
    type: 'symbol',
    source: 'gta_bicycle_shops',
    //only show circles when there is 1 bike shop within radius 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'shop-marker',
      'icon-size': 0.08,
      //allow overlap of other icon layers (so that all layers are simultaneously visible)
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });

  map.on('mouseenter', 'gta_bicycle_shop_unclustered', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'gta_bicycle_shop_unclustered', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'gta_bicycle_shop_unclustered', (e) => {
    if (e.features[0].properties.city!='Toronto' && (e.features[0].properties.address_number=='Not Available' | e.features[0].properties.address_street=='Not Available')){
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" + "<b>Address:</b> " + "Not Available" + "<br>" + "<b>Postal Code:</b> "
      + e.features[0].properties.postal_code + "<br>" + "<b>Unit No:</b>  " + e.features[0].properties.unit + "<br>" + "<b>City:</b>  " + e.features[0].properties.city + "<br>" + "<b>Phone:</b>  " + e.features[0].properties.phone + "<br>" +       
      "<b>Email:</b> " + e.features[0].properties.email + "<br>" + "<b>Website:</b> " + e.features[0].properties.website + "<br>" + "<b>Facebook:</b> " + e.features[0].properties.facebook + "<br>" + "<b>Opening Hours:</b> " + e.features[0].properties.opening_hours)
        .addTo(map);
    }
    else if (e.features[0].properties.city!='Toronto' && e.features[0].properties.address_number!='Not Available' && e.features[0].properties.address_street!='Not Available'){
      new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" + "<b>Address:</b> " + e.features[0].properties.address_number + " " + e.features[0].properties.address_street + "<br>" + "<b>Postal Code:</b> "
      + e.features[0].properties.postal_code + "<br>" + "<b>Unit No:</b>  " + e.features[0].properties.unit + "<br>" + "<b>City:</b>  " + e.features[0].properties.city + "<br>" + "<b>Phone:</b>  " + e.features[0].properties.phone + "<br>" +       
      "<b>Email:</b> " + e.features[0].properties.email + "<br>" + "<b>Website:</b> " + e.features[0].properties.website + "<br>" + "<b>Facebook:</b> " + e.features[0].properties.facebook + "<br>" + "<b>Opening Hours:</b> " + e.features[0].properties.opening_hours)
        .addTo(map);
    }
  });


   //add a geojson file source "toronto_bicycle_parking" for Toronto bike parking stations
  map.addSource('gta_bicycle_parking', {
    type: 'geojson',
    data: 'https://ireo00.github.io/GTAccesstoCycling/Data/gta_bicycle_parking.geojson',
    'generateId': true,
    //cluster the data to limit the symbology on the map at low zoom levels
    cluster: true,
    clusterMaxZoom: 14, //maximum zoom at which points cluster
    clusterRadius: 50 //distance over which points cluster
  });

  //add and style a layer of circles "toronto_bike_parking_clustered" from the defined "toronto_bicycle_parking" source for the clustered parking stations
  map.addLayer({
    'id': 'gta_bike_parking_clustered',
    'type': 'circle',
    'source': 'gta_bicycle_parking',
    //only show circles when there is more than 1 bike parking station within radius
    filter: ['has', 'point_count'],
    'paint': {
      'circle-color': '#84BCE4',
      //specify the radius of the circles based on whether the number of bike parking stations within radius is <10, 10-20, 20-50, 50-100 or >100
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        10,
        15,
        20,
        17,
        50,
        20,
        100,
        25
      ]
    }
  });

  //add and style a layer of symbols "toronto_bike_parking_cluster_count" from the defined "toronto_bicycle_parking" source for the text on top of the clustered parking stations
  map.addLayer({
    id: 'gta_bike_parking_cluster_count',
    type: 'symbol',
    source: 'gta_bicycle_parking',
    //only show text when there is more than 1 bike parking station within radius 
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      //allow overlap of other text layers (so that all layers are simultaneously visible)
      'text-allow-overlap': true,
      'text-ignore-placement': true
    }
  });

  //add and style a layer of circles "toronto_bike_parking_unclustered" from the defined "toronto_bicycle_parking" source for the unclustered (single) parking stations
  map.addLayer({
    id: 'gta_bike_parking_unclustered',
    type: 'symbol',
    source: 'gta_bicycle_parking',
    //only show circles when there is 1 bike parking station within radius 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'parking-marker',
      'icon-size': 0.13,
      //allow overlap of other icon layers (so that all layers are simultaneously visible)
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });


  // //add a geojson file source "toronto_bicycle_parking" for Toronto bike parking stations
  // map.addSource('gta_bicycle_parking', {
  //   type: 'geojson',
  //   data: 'https://ireo00.github.io/GTAccesstoCycling/Data/gta_bicycle_parking.geojson',
  //   'generateId': true,
  //   //cluster the data to limit the symbology on the map at low zoom levels
  //   cluster: true,
  //   clusterMaxZoom: 14, //maximum zoom at which points cluster
  //   clusterRadius: 50 //distance over which points cluster
  // });

  // //add and style a layer of circles "toronto_bike_parking_clustered" from the defined "toronto_bicycle_parking" source for the clustered parking stations
  // map.addLayer({
  //   'id': 'gta_bike_parking_clustered',
  //   'type': 'circle',
  //   'source': 'gta_bicycle_parking',
  //   //only show circles when there is more than 1 bike parking station within radius
  //   filter: ['has', 'point_count'],
  //   'paint': {
  //     'circle-color': '#11b4da',
  //     //specify the radius of the circles based on whether the number of bike parking stations within radius is <10, 10-20, 20-50, 50-100 or >100
  //     'circle-radius': [
  //       'step',
  //       ['get', 'point_count'],
  //       13,
  //       10,
  //       15,
  //       20,
  //       17,
  //       50,
  //       20,
  //       100,
  //       25
  //     ]
  //   }
  // });

  // //add and style a layer of symbols "toronto_bike_parking_cluster_count" from the defined "toronto_bicycle_parking" source for the text on top of the clustered parking stations
  // map.addLayer({
  //   id: 'gta_bike_parking_cluster_count',
  //   type: 'symbol',
  //   source: 'gta_bicycle_parking',
  //   //only show text when there is more than 1 bike parking station within radius 
  //   filter: ['has', 'point_count'],
  //   layout: {
  //     'text-field': ['get', 'point_count_abbreviated'],
  //     'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
  //     'text-size': 12,
  //     //allow overlap of other text layers (so that all layers are simultaneously visible)
  //     'text-allow-overlap': true,
  //     'text-ignore-placement': true
  //   }
  // });

  // //add and style a layer of circles "toronto_bike_parking_unclustered" from the defined "toronto_bicycle_parking" source for the unclustered (single) parking stations
  // map.addLayer({
  //   id: 'gta_bike_parking_unclustered',
  //   type: 'symbol',
  //   source: 'gta_bicycle_parking',
  //   //only show circles when there is 1 bike parking station within radius 
  //   filter: ['!', ['has', 'point_count']],
  //   layout: {
  //     'icon-image': 'parking-marker',
  //     'icon-size': 0.15, //0.15
  //     //allow overlap of other icon layers (so that all layers are simultaneously visible)
  //     'icon-allow-overlap': true,
  //     'icon-ignore-placement': true
  //   }
  // });


  // map.on('mouseenter', 'gta_bike_parking_unclustered', () => {
  //   map.getCanvas().style.cursor = 'pointer';
  // });

  // map.on('mouseleave', 'gta_bike_parking_unclustered', () => {
  //   map.getCanvas().style.cursor = '';
  // });

  // map.on('click', 'gta_bike_parking_unclustered', (e) => {
  //   new mapboxgl.Popup()
  //     .setLngLat(e.lngLat)
  //     .setHTML("<b>Name:</b> " + e.features[0].properties.name + "<br>" +  "<b>Covered?:</b> " + e.features[0].properties.covered + "<br>" + "<b>Fee:</b> " + e.features[0].properties.fee + "<br>" + "<b>Parking Type:</b> " + e.features[0].properties.parking_type + "<br>" +       
  //     "<b>Capacity:</b> " + e.features[0].properties.capacity)
  //       .addTo(map);
  // });

  map.addSource('traffic_source', {
    'type': 'vector',
    'url': 'mapbox://mapbox.mapbox-traffic-v1'
  });
  map.addLayer({
    'id': 'traffic',
    'type': 'line',
    'source': 'traffic_source',
    'layout': { 'visibility': 'none' },
    'paint': {
      'line-color': [
        "case",
        [
          "==",
          "low",
          [
            "get",
            "congestion"
          ]
        ],
        "green",
        [
          "==",
          "moderate",
          [
            "get",
            "congestion"
          ]
        ],
        "#ffff00",
        [
          "==",
          "heavy",
          [
            "get",
            "congestion"
          ]
        ],
        "orange",
        [
          "==",
          "severe",
          [
            "get",
            "congestion"
          ]
        ],
        "red",
        "#000000"
      ],
      'line-width': 2
    },
    'source-layer': 'traffic'
  });



  // map.addSource('weather1', {
  //   type: 'geojson',
  //   data: 'https://ireo00.github.io/GTAccesstoCycling/Data/all_boundaries.geojson'
  // });

  // map.addLayer({
  //   'id': 'weather_polygons1',
  //   'type': 'fill',
  //   'source': 'weather1',
  //   'paint': {
  //     'fill-color': 'red'
  //   },
  //   });

  //Add datasource using GeoJSON variable
  map.addSource('inputgeojson', {
    type: 'geojson',
    data: geojson
  });

  //Set style for when new points are added to the data source
  map.addLayer({
    'id': 'input-pnts',
    'type': 'circle',
    'source': 'inputgeojson',
    'paint': {
      'circle-radius': 5,
      'circle-color': 'blue'
    }
  });

  map.addSource('buffgeojson', {
    "type": "geojson",
    "data": buffresult  //use buffer geojson variable as data source
  });

  //Show buffers on map using styling
  map.addLayer({
    "id": "inputpointbuff",
    "type": "fill",
    "source": "buffgeojson",
    "paint": {
      'fill-color': "blue",
      'fill-opacity': 0.5,
      'fill-outline-color': "black"
    }
  });

});

//When 'Plan Your Trip!' is clicked...
document.getElementById('collapsible').addEventListener('click', () => {
  //retrieve the div containing its content
  var content = document.getElementById('content');
  //if this content was already open...
  if (content.style.display === "block") {
    //close it
    content.style.display = "none";
    //get rid of all points and buffers
    geojson.features = []
    map.getSource('inputgeojson').setData(geojson);
    buffresult.features = []
    map.getSource('buffgeojson').setData(buffresult);
    //get rif of any nearby features
    document.getElementById('nearby').innerHTML = ''
    //change the buffer button back to 'GO' in case it was already clicked
    document.getElementById('bufferbutton').textContent = "GO"
    //reinitialize longitude/latitude list of nearby features
    divs_lons = []
    divs_lats = []
    divs_properties = []
    divs_types = []
    //fly back to original view
    map.flyTo({
      center: [-79.266, 43.926],
      zoom: 8.65,
      bearing: -17.7,
      essential: true
    });
    //change the instructions back to the default
    const instructions = document.getElementById('instructions');
    instructions.innerHTML = 'Click anywhere on map';
  }
  //if the content was closed///
  else {
    //open it (i.e. display it)
    content.style.display = "block";
    //but don't display the slider yet
    slider_div = document.getElementById('slider_div');
    slider_div.style.display = 'none';
  }
});


let lastExecution = 0
//when the map is clicked...
map.on('click', (e) => {
  //if the 'Plan your Trip!' menu is open and no buffer has been triggered yet...
  if (content.style.display === "block" && document.getElementById('bufferbutton').textContent === "GO" && ((lastExecution + 500) < Date.now())) {
    lastExecution = Date.now() //this is to stop rebound?
    //Store clicked point on map as geojson feature
    const clickedpoint = {
      'type': 'Feature',
      'geometry': {
        'type': 'Point',
        'coordinates': [e.lngLat.lng, e.lngLat.lat]
      }
    };
    //reinitialize list of points to be empty
    geojson.features = []
    //Add clicked point to previously empty geojson FeatureCollection variable
    geojson.features.push(clickedpoint);
    //change instructions 
    const instructions = document.getElementById('instructions');
    instructions.innerHTML = 'Click GO';
    //Update the datasource to include clicked points
    map.getSource('inputgeojson').setData(geojson);
    lonlat_click = e.lngLat
    //show slider
    //slider_div = document.getElementById('slider_div');
    //slider_div.style.display = 'block'
  }
});

//when the 'GO' button is clicked in the 'Plan your trip!'...
document.getElementById('bufferbutton').addEventListener('click', () => {

  if (document.getElementById('bufferbutton').textContent === "GO" && geojson.features.length > 0) {
    document.getElementById('bufferbutton').innerHTML = "CLOSE"
    map.setLayoutProperty('toronto_bikeshare_unclustered', 'visibility', 'visible')
    map.setLayoutProperty('toronto_bikeshare_clustered', 'visibility', 'visible')
    map.setLayoutProperty('toronto_bikeshare_cluster_count', 'visibility', 'visible')
    document.getElementById('layercheck2').checked = true
    //show slider
    slider_div = document.getElementById('slider_div');
    slider_div.style.display = 'block'
    let lastExecution2 = 0
    document.getElementById('slider').addEventListener('input', (e) => {
      //e.preventDefault();
      document.getElementById('radius_value').innerHTML=" " + e.target.value +"km"
      if (e.target.value!=0 && ((lastExecution2 + 900) < Date.now())){ 
      console.log((lastExecution2 + 800), Date.now())
      lastExecution2 = Date.now()
      const radius = e.target.value;
      //create the buffer for each point
    buffresult.features = []
    document.getElementById('nearby').innerHTML=''
    divs_lons=[]
    divs_lats=[]
    divs_properties=[]
    divs_types=[]
    geojson.features.forEach((feature) => {
      let buffer = turf.buffer(feature, radius);
      buffresult.features.push(buffer);
    });
    map.getSource('buffgeojson').setData(buffresult);
    //change instructions
    const instructions = document.getElementById('instructions');
    instructions.innerHTML = 'Click on any features below to zoom in ';
    if (isProcessing==true){
      return 
    }
    isProcessing=true
    get_bikeshops(divs_lons, divs_lats, divs_properties, divs_types)
    //get bike shops


      }
      else {
        buffresult.features = []
        map.getSource('buffgeojson').setData(buffresult);
        document.getElementById('nearby').innerHTML = ''
        divs_lons = []
        divs_lats = []
        divs_properties = []
        divs_types = []
      }
    });



  }
  else {
    slider_div = document.getElementById('slider_div');
    slider_div.style.display = 'none'
    instructions.innerHTML = 'Click anywhere on the map';
    document.getElementById('bufferbutton').innerHTML = "GO"
    geojson.features = []
    map.getSource('inputgeojson').setData(geojson);
    buffresult.features = []
    map.getSource('buffgeojson').setData(buffresult);

    document.getElementById('nearby').innerHTML = ''
    divs_lons = []
    divs_lats = []
    divs_properties = []
    divs_types = []
    map.flyTo({
      center: [-79.266, 43.926],//[parseFloat(divs_lons[i]), divs_lats[i]],
      zoom: 8.65,
      bearing: -17.7,
      essential: true
    });

  }

});


function get_bikeshops(divs_lons, divs_lats, divs_properties, divs_types) {
  //get the bike shops
  fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_bicycle_shops.geojson')
  .then(response => response.json())
  .then(response => {
    shops = response; // Store geojson as variable using URL from fetch response
    //retrieve div for nearby stores
    const nearby = document.getElementById('nearby');
    //create text within it that says 'Nearby Shops'
    const text_div = document.createElement('div');
    const text = document.createElement('span');
    text.innerHTML = 'Nearby Shops';
    text.style.fontWeight = 'bold';
    //check whether any shops exist within the buffer - if they do, show the text 'Nearby Shops'
    if (turf.pointsWithinPolygon(shops, buffresult.features[0]).features.length > 0) {
      text_div.appendChild(text)
      nearby.appendChild(text_div)
    }
    //check whether any shops exist within the buffer
    turf.pointsWithinPolygon(shops, buffresult.features[0]).features.forEach((feature) => {
      //create a div with their name if they do exist
      const item = document.createElement('div');
      item.className = 'divs'
      divs_lons.push(feature.geometry.coordinates[0])
      divs_lats.push(feature.geometry.coordinates[1])
      divs_properties.push(feature.properties)
      console.log(feature.properties)
      divs_types.push("shop")
      //console.log(divs_lons)
      const value = document.createElement('span');
      value.innerHTML = `${feature.properties.name}`;
      item.appendChild(value);
      nearby.appendChild(item);
    });
    //trigger list_click
    get_bikeparking(divs_lons, divs_lats, divs_properties, divs_types)
  });
}

function get_bikeparking(divs_lons, divs_lats, divs_properties, divs_types){
  fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_bicycle_parking.geojson') //toronto
      .then(response => response.json())
      .then(response => {
        parkings = response; // Store geojson as variable using URL from fetch response
        //retrieve div for nearby parkings
        const nearby_p = document.getElementById('nearby');
        //create text within it that says 'Nearby Parking'
        const text_div_p = document.createElement('div');
        const text_p = document.createElement('span');
        //create text within it that says 'Nearby Parking'
        text_p.innerHTML = 'Nearby Parking'
        text_p.style.fontWeight = 'bold';
        //check whether any shops exist within the buffer - if they do, show the text 'Nearby Parking'
        if (turf.pointsWithinPolygon(parkings, buffresult.features[0]).features.length > 0) {
          text_div_p.appendChild(text_p)
          nearby_p.appendChild(text_div_p)
        }
        //check whether any shops exist within the buffer
        turf.pointsWithinPolygon(parkings, buffresult.features[0]).features.forEach((feature) => {
          //create a div with their name if they do exist
          const item_p = document.createElement('div');
          item_p.className = 'divs'
          divs_lons.push(feature.geometry.coordinates[0])
          divs_lats.push(feature.geometry.coordinates[1])
          divs_types.push("parking")
          divs_properties.push(feature.properties)
          const value_p = document.createElement('span');
          if (feature.properties.name != 'None' && feature.properties.name != 'Not Available') {
            value_p.innerHTML = `${feature.properties.name}`;
          } else {
            value_p.innerHTML = `Bike Parking ${feature.properties.number}`; //feature.properties.id
          }
          item_p.appendChild(value_p);
          nearby_p.appendChild(item_p);
        });
        //trigger list_click
        get_bikeways(divs_lons, divs_lats, divs_properties, divs_types)
      });
}

function get_bikeways(divs_lons, divs_lats, divs_properties, divs_types){
  fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_bikeways.geojson') //toronto
      .then(response => response.json())
      .then(response => {
        bikeways = response; // Store geojson as variable using URL from fetch response
        //retrieve div for nearby parkings
        const nearby_b = document.getElementById('nearby');
        //create text within it that says 'Nearby Parking'
        const text_div_b = document.createElement('div');
        const text_b = document.createElement('span');
        //create text within it that says 'Nearby Parking'
        text_b.innerHTML = 'Nearby Bikeways'
        text_b.style.fontWeight = 'bold';
        //check whether any shops exist within the buffer - if they do, show the text 'Nearby Parking'
        bikeways.features.forEach((feature) => {
          //console.log(feature.geometry.coordinates[0].length)
          if (feature.geometry.coordinates[0].length>0 && turf.booleanIntersects(feature, buffresult.features[0])===true) {
          text_div_b.appendChild(text_b)
          nearby_b.appendChild(text_div_b)
          return
        }
          });
        //check whether any shops exist within the buffer
        bikeways.features.forEach((feature) => {
          if (feature.geometry.coordinates[0].length>0 && turf.booleanIntersects(feature, buffresult.features[0])){
          //create a div with their name if they do exist
          const item_b = document.createElement('div');
          item_b.className = 'divs'
          divs_lons.push(feature.geometry.coordinates[0][0][0])
          divs_lats.push(feature.geometry.coordinates[0][0][1])
          divs_types.push("bikeway")
          divs_properties.push(feature.properties)
          const value_b = document.createElement('span');
          if (feature.properties.Name!=null && feature.properties.Name != 'None' && feature.properties.Name != 'Not Available') {
            value_b.innerHTML = `${feature.properties.Name}`;
          } else {
            value_b.innerHTML = `Bikeway ${feature.properties.number}`; //feature.properties.id
          }
          item_b.appendChild(value_b);
          nearby_b.appendChild(item_b);
          }
        });
        //trigger list_click
        get_bikeshare(divs_lons, divs_lats, divs_properties, divs_types)
      });
      //trigger list_click
}

// function get_bikeparking(divs_lons, divs_lats, divs_properties, divs_types) {
//   fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_bicycle_parking.geojson') //toronto
//     .then(response => response.json())
//     .then(response => {
//       parkings = response; // Store geojson as variable using URL from fetch response
//       //retrieve div for nearby parkings
//       const nearby_p = document.getElementById('nearby');
//       //create text within it that says 'Nearby Parking'
//       const text_div_p = document.createElement('div');
//       const text_p = document.createElement('span');
//       //create text within it that says 'Nearby Parking'
//       text_p.innerHTML = 'Nearby Parking'
//       text_p.style.fontWeight = 'bold';
//       //check whether any shops exist within the buffer - if they do, show the text 'Nearby Parking'
//       if (turf.pointsWithinPolygon(parkings, buffresult.features[0]).features.length > 0) {
//         text_div_p.appendChild(text_p)
//         nearby_p.appendChild(text_div_p)
//       }
//       //check whether any shops exist within the buffer
//       turf.pointsWithinPolygon(parkings, buffresult.features[0]).features.forEach((feature) => {
//         //create a div with their name if they do exist
//         const item_p = document.createElement('div');
//         item_p.className = 'divs'
//         divs_lons.push(feature.geometry.coordinates[0])
//         divs_lats.push(feature.geometry.coordinates[1])
//         divs_types.push("parking")
//         divs_properties.push(feature.properties)
//         const value_p = document.createElement('span');
//         if (feature.properties.name != 'None' && feature.properties.name != 'Not Available') {
//           value_p.innerHTML = `${feature.properties.name}`;
//         } else {
//           value_p.innerHTML = `Bike Parking ${feature.properties.number}`; //feature.properties.id
//         }
//         item_p.appendChild(value_p);
//         nearby_p.appendChild(item_p);
//       });
//       //trigger list_click
//       get_bikeshare(divs_lons, divs_lats, divs_properties, divs_types)
//     });
// }

function get_bikeshare(divs_lons, divs_lats, divs_properties, divs_types) {
  // fetch('https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information')
  //     .then(response => response.json())
  //     .then(response => {
  shares = {
    "type": "FeatureCollection",
    "features": test
  }; // Store geojson as variable using URL from fetch response
  //retrieve div for nearby parkings
  const nearby_s = document.getElementById('nearby');
  //create text within it that says 'Nearby Parking'
  const text_div_s = document.createElement('div');
  const text_s = document.createElement('span');
  //create text within it that says 'Nearby Parking'
  text_s.innerHTML = 'Nearby BikeShare'
  text_s.style.fontWeight = 'bold';
  //check whether any shops exist within the buffer - if they do, show the text 'Nearby Parking'
  if (turf.pointsWithinPolygon(shares, buffresult.features[0]).features.length > 0) {
    text_div_s.appendChild(text_s)
    nearby_s.appendChild(text_div_s)
  }
  //check whether any shops exist within the buffer
  turf.pointsWithinPolygon(shares, buffresult.features[0]).features.forEach((feature) => {
    //create a div with their name if they do exist
    const item_s = document.createElement('div');
    item_s.className = 'divs'
    divs_lons.push(feature.geometry.coordinates[0])
    divs_lats.push(feature.geometry.coordinates[1])
    divs_types.push("share")
    divs_properties.push(feature.properties)
    const value_s = document.createElement('span');
    if (feature.properties.name != 'None') {
      value_s.innerHTML = `${feature.properties.name}`;
    } else {
      value_s.innerHTML = `BikeShare ${feature.properties.station_id}`;
    }
    item_s.appendChild(value_s);
    nearby_s.appendChild(item_s);
  });
  //trigger list_click
  get_weather(divs_lons, divs_lats, divs_properties, divs_types)
  // });
}

function get_weather(divs_lons, divs_lats, divs_properties, divs_types) {
  let lon_point = lonlat_click['lng']
  let lat_point = lonlat_click['lat']
  var today_point = new Date()
  if ((today_point.getMonth()+1)<10) {
    month_point='0'+(today_point.getMonth()+1)
  }
  else {
    month_point=today_point.getMonth()+1
  }
  if (today_point.getDate()<10) {
    day_point='0'+(today_point.getDate())
  }
  else {
    day_point=today_point.getDate()
  }
  var date_point = today_point.getFullYear() +'-'+month_point+'-'+day_point //today_point.getFullYear() +'-'+'0'+(today_point.getMonth()+1)+'-'+today_point.getDate()
  var hour_point = today_point.getHours()
  //console.log(lonlat_click['lng'])
  const nearby_w = document.getElementById('nearby');
  //create text within it that says 'Nearby Parking'
  const text_div_w = document.createElement('div');
  const text_w = document.createElement('span');
  //create text within it that says 'Nearby Parking'
  text_w.innerHTML = 'Weather'
  text_w.style.fontWeight = 'bold';
  text_div_w.appendChild(text_w)
  nearby_w.appendChild(text_div_w)
  fetch(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat_point}&longitude=${lon_point}&hourly=temperature_2m&start_date=${date_point}&end_date=${date_point}`)
    .then(response => response.json())
    .then(response => {
      temp_at_point = response;

      const item_temp = document.createElement('div');
      const value_temp = document.createElement('span');
      value_temp.innerHTML = temp_at_point.hourly.temperature_2m[Math.floor(hour_point / 3)] + '°C' //temp_at_point.hourly.temperature_2m.length - 1
      item_temp.appendChild(value_temp);
      nearby_w.appendChild(item_temp);
    });
  fetch(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat_point}&longitude=${lon_point}&hourly=precipitation&start_date=${date_point}&end_date=${date_point}`)
    .then(response => response.json())
    .then(response => {
      prec_at_point = response;
      const nearby_w = document.getElementById('nearby');
      //create text within it that says 'Nearby Parking'
      const item_prec = document.createElement('div');
      const value_prec = document.createElement('span');
      value_prec.innerHTML = prec_at_point.hourly.precipitation[Math.floor(hour_point / 3)] + 'mm total precipitation in last hour' //prec_at_point.hourly.precipitation.length - 1
      item_prec.appendChild(value_prec);
      nearby_w.appendChild(item_prec);
    });
  fetch(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat_point}&longitude=${lon_point}&hourly=snowfall&start_date=${date_point}&end_date=${date_point}`)
    .then(response => response.json())
    .then(response => {
      snow_at_point = response;
      const nearby_w = document.getElementById('nearby');
      //create text within it that says 'Nearby Parking'
      const item_snow = document.createElement('div');
      const value_snow = document.createElement('span');
      value_snow.innerHTML = snow_at_point.hourly.snowfall[Math.floor(hour_point / 3)] + 'mm snowfall in last hour' //snow_at_point.hourly.snowfall.length - 1
      item_snow.appendChild(value_snow);
      nearby_w.appendChild(item_snow);
    });
  //console.log(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat_point}&longitude=${lon_point}&hourly=windspeed_10m&start_date=${date_point}&end_date=${date_point}`)
  fetch(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat_point}&longitude=${lon_point}&hourly=windspeed_10m&start_date=${date_point}&end_date=${date_point}`)
    .then(response => response.json())
    .then(response => {
      wind_at_point = response;
      const nearby_w = document.getElementById('nearby');
      //create text within it that says 'Nearby Parking'
      const item_wind = document.createElement('div');
      const value_wind = document.createElement('span');
      value_wind.innerHTML = wind_at_point.hourly.windspeed_10m[Math.floor(hour_point / 3)] + 'km/h wind at 10m above ground' //wind_at_point.hourly.windspeed_10m.length - 1
      item_wind.appendChild(value_wind);
      nearby_w.appendChild(item_wind);
    });

  list_click(divs_lons, divs_lats, divs_properties, divs_types)

}


function list_click(divs_lons, divs_lats, divs_properties, divs_types) {
  isProcessing = false
  var elements = document.getElementsByClassName("divs");
  //console.log(elements.length)
  let popup_shop
  let popup_parking
  if (elements.length > 0) {
    for (var i = 0; i < elements.length; i++) {
      let lat1 = divs_lats[i]
      let lon1 = divs_lons[i]
      //console.log(lon1, lat1)
      let properties1 = divs_properties[i]
      let features1 = divs_types[i]

      lastExecution3 = 0
      elements[i].addEventListener('click', () => {
    
      if ((lastExecution3+600)<Date.now()){
      lastExecution3=Date.now()
        map.flyTo({
          center: [lon1, lat1],
          zoom: 16,
          bearing: -17.7,
          essential: true
        });
        
        if (features1==="shop"){
          if (properties1.city==='Toronto'){
          popup_shop=new mapboxgl.Popup()
          .setLngLat([lon1, lat1])
          .setHTML("<b>Name:</b> " + properties1.name + "<br>" + "<b>Address:</b> " + properties1.address + "<br>" + "<b>Postal Code:</b> "
        + properties1.postal_code + "<br>" + "<b>Ward:</b> " + properties1.ward + "<br>" +  "<b>Unit No:</b>  " + properties1.unit + "<br>" + "<b>City:</b>  " + properties1.city + "<br>" + "<b>Phone:</b>  " + properties1.phone + "<br>" +       
        "<b>Email:</b> " + properties1.email + "<br>" + "<b>Rentals?:</b> " + properties1.rental)
          .addTo(map);
          }

          
          else if (properties1.city!='Toronto' && (properties1.address_number=='Not Available' | properties1.address_street=='Not Available')){
              popup_shop=new mapboxgl.Popup()
                .setLngLat([lon1, lat1])
                .setHTML("<b>Name:</b> " + properties1.name + "<br>" + "<b>Address:</b> " + "Not Available" + "<br>" + "<b>Postal Code:</b> "
      + properties1.postal_code + "<br>" + "<b>Unit No:</b>  " + properties1.unit + "<br>" + "<b>City:</b>  " + properties1.city + "<br>" + "<b>Phone:</b>  " + properties1.phone + "<br>" +       
      "<b>Email:</b> " + properties1.email + "<br>" + "<b>Website:</b> " + properties1.website + "<br>" + "<b>Facebook:</b> " + properties1.facebook + "<br>" + "<b>Opening Hours:</b> " + properties1.opening_hours)
        .addTo(map);
              }

          else if (properties1.city!='Toronto' && properties1.address_number!='Not Available' && properties1.address_street!='Not Available'){
                popup_shop=new mapboxgl.Popup()
                  .setLngLat([lon1, lat1])
                  .setHTML("<b>Name:</b> " + properties1.name + "<br>" + "<b>Address:</b> " + properties1.address_number + " " + properties1.address_street + "<br>" + "<b>Postal Code:</b> "
        + properties1.postal_code + "<br>" + "<b>Unit No:</b>  " + properties1.unit + "<br>" + "<b>City:</b>  " + properties1.city + "<br>" + "<b>Phone:</b>  " + properties1.phone + "<br>" +       
        "<b>Email:</b> " + properties1.email + "<br>" + "<b>Website:</b> " + properties1.website + "<br>" + "<b>Facebook:</b> " + properties1.facebook + "<br>" + "<b>Opening Hours:</b> " + properties1.opening_hours)
          .addTo(map);
                }
        
      }
        else if (features1==="parking"){
        if (properties1.city==='Toronto'){
        popup_parking=new mapboxgl.Popup()
          .setLngLat([lon1, lat1])
          .setHTML("<b>Name:</b> " + properties1.name + "<br>" + "<b>Address:</b> " + properties1.address + "<br>" + "<b>Postal Code:</b> "
          + properties1.postal_code + "<br>" + "<b>Ward:</b> " + properties1.ward + "<br>" + "<b>City:</b>  " + properties1.city + "<br>" + "<b>Parking Type:</b>  " + properties1.parking_type + "<br>" +       
          "<b>Capacity:</b> " + properties1.bike_capacity)
            .addTo(map);
        }
          else if (properties1.city!='Toronto'){
            popup_parking=new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Name:</b> " + properties1.name + "<br>" +  "<b>Covered?:</b> " + properties1.covered + "<br>" + "<b>Fee:</b> " + properties1.fee + "<br>" + "<b>Parking Type:</b> " + properties1.parking_type + "<br>" +       
              "<b>Capacity:</b> " + properties1.capacity) //properties1.bike_capacity
                .addTo(map);
            }
        }
        else if (features1==="share"){
          popup_parking=new mapboxgl.Popup()
          let station_id=properties1.station_id
          let name=properties1.name
          let address=properties1.address
          let post_code=properties1.post_code
          fetch('https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status')
            .then(response => response.json())
            .then(response => {
              bikeshare_status = response;
              bikeshare_status.data.stations.forEach((station) => {
              
                if (station.station_id===station_id){
                  console.log(station.station_id)
                  if (post_code!="undefined"){
                  new mapboxgl.Popup()
                  .setLngLat([lon1, lat1])
                  .setHTML("<b>Name:</b> " + name + "<br>" + "<b>Address:</b> " + address + "<br>" + "<b>Postal Code:</b> " + post_code + "<br>" + "<b>No. Available Bikes:</b> " + station.num_bikes_available + "<br>" + "<b>No. Available Docks:</b> " + station.num_docks_available)
                    .addTo(map);
                  }
                  else if (post_code=="undefined") {
                    new mapboxgl.Popup()
                  .setLngLat([lon1, lat1])
                  .setHTML("<b>Name:</b> " + name + "<br>" + "<b>Address:</b> " + address + "<br>" + "<b>No. Available Bikes:</b> " + station.num_bikes_available + "<br>" + "<b>No. Available Docks:</b> " + station.num_docks_available)
                    .addTo(map);
                  }
                }

              })
            }); 
          // popup_parking=new mapboxgl.Popup()
          //   .setLngLat([lon1, lat1])
          //   .setHTML("No. of Available Bikes: " + properties1.station_id +properties1.num_bikes_available + "<br>" + "No. of Available Docks: " + properties1.num_docks_available)
          //     .addTo(map);
          }
          else if (features1==="bikeway"){
 
              if (properties1.region==='Whitby'){
                new mapboxgl.Popup()
                .setLngLat([lon1, lat1])
                .setHTML("<b>Facility:</b> " + properties1.type + "<br>" + "<b>Classification:</b> " + properties1.classification + "<br>" + "<b>Street Name:</b> " + properties1['road name'])
                  .addTo(map);
              }
              else if (properties1.region==='Ajax'){
                new mapboxgl.Popup()
                .setLngLat([lon1, lat1])
                .setHTML("<b>Facility:</b> " + properties1.type + "<br>" + "<b>Classification:</b> " + properties1.classification + "<br>" + "<b>Street:</b> " + (properties1.location).substring(0, (properties1.location).length-9))
                  .addTo(map);
              }
              else if (properties1.region==='Oakville'){
                new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Facility:</b> " + properties1.type + "<br>" + "<b>Classification:</b> "  + properties1.classification + "<br>" + "<b>Surface:</b> "  + properties1.surface)
                .addTo(map);
              }
              else if (properties1.region==='Milton'){
                new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Facility:</b> " +  properties1.type + "<br>" + "<b>Classification:</b> " + properties1.classification + "<br>" + "<b>Surface:</b> "  + properties1.surface)
                .addTo(map);
              }
              else if (properties1.region==='Burlington'){
                new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Street Name:</b> " + properties1.street_name + "<br>" + "<b>Facility:</b> " + properties1.type + "<br>" + "<b>Classification:</b> " + properties1.classification)
                .addTo(map);
              }
              else if (properties1.region==='Durham'){
                new mapboxgl.Popup()
                .setLngLat([lon1, lat1])
                .setHTML("<b>Name:</b> "+ properties1.Name + "<br>" + "<b>Classification:</b> " + properties1.classification)
                  .addTo(map);
              }
              else if (properties1.region==='Peel'){
                new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Name:</b> " + properties1.Name + "<br>" + "<b>Facility:</b> " + properties1.type + "<br>" + "<b>Classification:</b> " +  properties1.classification +
              "<br>" + "<b>Surface:</b> " + properties1.surface + "<br>" + "<b>Municipality:</b> " +  properties1.Municipality) //if statement needed
                .addTo(map);
              }
              else if (properties1.region==='York'){
                console.log(properties1.type)
                new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Name:</b> " + properties1.Name + "<br>" + "<b>Facility:</b> " + properties1.type + "<br>" + "<b>Classification:</b> " + properties1.classification +
              "<br>" + "<b>Surface:</b> " + properties1.surface + "<br>" + "<b>Municipality:</b> " +  properties1.Municipality ) //if statement needed for "systems"
                .addTo(map);
              }
              else if (properties1.region==='Toronto'){
                console.log(properties1)
                new mapboxgl.Popup()
              .setLngLat([lon1, lat1])
              .setHTML("<b>Name:</b> " + properties1.Name + "<br>" + "<b>Facility 1:</b> " + properties1.type +  "<br>" + "<b>Classification:</b> " + properties1.classification
              + "<br>" + "<b>Facility 2:</b> " + properties1.secondary_type) //if statement
                .addTo(map);
              }

                  
            }
        
      }
      });
    };
  };
}







function weather_api(variable) {
  let random_list = []
  let temperature_list = []
  let index_list = []
  fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_centroids.geojson')
    .then(response => response.json())
    .then(response => {
      //console.log(response); //Check response in console
      all_centroids = response; // Store geojson as variable using URL from fetch response
      //all_centroids.features.forEach((feature) => {
      for (i = 0; i < all_centroids.features.length; i++) {
        var lat = all_centroids.features[i].geometry.coordinates[1];
        var lon = all_centroids.features[i].geometry.coordinates[0];
        var today = new Date()
        if ((today.getMonth()+1)<10) {
          month='0'+(today.getMonth()+1)
        }
        else {
          month=today.getMonth()+1
        }
        if (today.getDate()<10) {
          day='0'+(today.getDate())
        }
        else {
          day=today.getDate()
        }
        var date = today.getFullYear() +'-'+month+'-'+day //today.getFullYear() +'-'+'0'+(today.getMonth()+1)+'-'+today.getDate()
        var hour = today.getHours()
        //console.log(i)
        weat(i, lat, lon, date, hour, random_list, temperature_list, index_list, variable)
      };
      //})
    });
}

function weat(i, lat, lon, date, hour, random_list, temperature_list, index_list, variable) {

  //fetch(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&start_date=${date}&end_date=${date}`)
  //console.log(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat}&longitude=${lon}&hourly=${variable}&start_date=${date}&end_date=${date}`)
  //console.log(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat}&longitude=${lon}&hourly=${variable}&start_date=${date}&end_date=${date}`)
  fetch(`https://api.open-meteo.com/v1/ecmwf?latitude=${lat}&longitude=${lon}&hourly=${variable}&start_date=${date}&end_date=${date}`)
    .then(response => response.json())
    .then(response => {
      //console.log(response); //Check response in console
      weather = response; // Store geojson as variable using URL from fetch response
      //console.log(weather, weather.hourly[variable][weather.hourly[variable].length - 1])
      polygon1(i, lat, lon, date, hour, weather, random_list, temperature_list, index_list, variable)
    });
  // console.log("weather", weather_test.length)
  // if (weather_test.length==all_centroids.features.length){
  //   console.log("no",weather_test)
  //   work()
  // }
}

function polygon1(i, lat, lon, date, hour, weather, random_list, temperature_list, index_list, variable) {

  fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_boundaries.geojson')
    .then(response => response.json())
    .then(response => {
      //console.log(response); //Check response in console
      polygon = response; // Store geojson as variable using URL from fetch response
      //polygon.features.forEach((polygonfeature) => {
      for (let count = 0; count < polygon.features.length; count++) {
        //if (turf.pointsWithinPolygon(feature,polygonfeature).features.length>0){
        //console.log(all_centroids.features[i], polygon.features[count])
        if (turf.pointsWithinPolygon(all_centroids.features[i], polygon.features[count]).features.length > 0) {
          //let polygon_coordinates=polygonfeature.geometry.coordinates[0][0]
          let polygon_coordinates = polygon.features[count].geometry.coordinates[0][0]
          let temperature = weather.hourly[variable][Math.floor(hour / 3)] //[weather.hourly[variable].length - 1]
          //console.log(hour, Math.floor(hour/ 3))
          //console.log("2", weather, weather.hourly[variable][weather.hourly[variable].length - 1])
          //weather_test.push(JSON.parse(`{"type": "Feature", "properties": {"temperature":${temperature}}, "geometry": {"type": "MultiPolygon", "coordinates": [[[${polygon_coordinates}]]]}}`))
          //console.log("yes",weather_test)
          polygon.features[count].properties.TEMP = temperature
          temperature_list.push(temperature)
          index_list.push(count)
          //console.log(polygon.features[counter].properties.TEMP, polygon.features[counter-1].properties.TEMP)
          //console.log(count)
          //console.log(i, lat, lon)
          random_list.push(i)
          if (random_list.length == all_centroids.features.length) {
            add_property(random_list, temperature_list, index_list, variable)
          }
          //console.log("len", random_list.length)
          // console.log(polygon.features[0].properties.TEMP)
          // if (random_list.length==all_centroids.features.length){
          //   console.log("no")
          //   work()
        }
      }
      //}); 
      //};
    });
}

function add_property(random_list, temperature_list, index_list, variable) {

  console.log(temperature_list, index_list)
  fetch('https://ireo00.github.io/GTAccesstoCycling/Data/all_boundaries.geojson')
    .then(response => response.json())
    .then(response => {
      polygon2 = response;
      for (j = 0; j < polygon2.features.length; j++) {
        polygon2.features[j].properties.TEMP = temperature_list[index_list.indexOf(j)]
        if (j == polygon2.features.length - 1) {
          work(variable)
        }
      }
    });
}

  function work(variable){
   
   
      map.addSource('weather', {
        type: 'geojson',
        data: polygon2,
        'generateId': true,
      });
      if (variable==='temperature_2m'){
      map.addLayer({
        'id': 'weather_polygons',
        'type': 'fill',
        'source': 'weather',
        filter: ['has', 'TEMP'],
        'paint': {
          'fill-color': 
          {
            property: 'TEMP',
            stops: [[-20, 'blue'], [0, '#fff'], [20, 'red']]
          },
          'fill-opacity': 0.5
          // ['step',
          // ['get', 'TEMP'], 'red', 
          // 4, 'blue', 5, 'green', 6, 'orange'],
          // 'fill-opacity': 0.5
        },
        });   
      }
      else if (variable==='precipitation'){
        map.addLayer({
          'id': 'weather_polygons',
          'type': 'fill',
          'source': 'weather',
          filter: ['has', 'TEMP'],
          'paint': {
            'fill-color': 
          {
            property: 'TEMP',
            stops: [[0, '#fff'], [20, 'blue']]
          },
          'fill-opacity': 0.5
            // 'fill-color': ['step',
            // ['get', 'TEMP'], 'red', 
            // 0, 'blue', 1, 'green', 10, 'orange'],
            // 'fill-opacity': 0.5
          },
          });   
        }
        else if (variable==='snowfall'){
          map.addLayer({
            'id': 'weather_polygons',
            'type': 'fill',
            'source': 'weather',
            filter: ['has', 'TEMP'],
            'paint': {
              'fill-color': 
          {
            property: 'TEMP',
            stops: [[0, '#fff'], [7, 'blue']]
          },
          'fill-opacity': 0.5
              // 'fill-color': ['step',
              // ['get', 'TEMP'], 'red', 
              // 0, 'blue', 1, 'green', 10, 'orange'],
              // 'fill-opacity': 0.5
            },
            });   
          }
          else if (variable==='windspeed_10m'){
            map.addLayer({
              'id': 'weather_polygons',
              'type': 'fill',
              'source': 'weather',
              filter: ['has', 'TEMP'],
              'paint': {
                'fill-color': 
          {
            property: 'TEMP',
            stops: [[0, '#fff'], [50, 'blue']]
          },
          'fill-opacity': 0.5
                // 'fill-color': ['step',
                // ['get', 'TEMP'], 'red', 
                // 10, 'blue', 20, 'green', 30, 'orange'],
                // 'fill-opacity': 0.5
              },
              });   
            }
        //console.log(polygon.features)
  }
//   else if (variable === 'precipitation') {
//     map.addLayer({
//       'id': 'weather_polygons',
//       'type': 'fill',
//       'source': 'weather',
//       filter: ['has', 'TEMP'],
//       'paint': {
//         'fill-color': ['step',
//           ['get', 'TEMP'], 'red',
//           0, 'blue', 1, 'green', 10, 'orange'],
//         'fill-opacity': 0.5
//       },
//     });
//   }
//   else if (variable === 'snowfall') {
//     map.addLayer({
//       'id': 'weather_polygons',
//       'type': 'fill',
//       'source': 'weather',
//       filter: ['has', 'TEMP'],
//       'paint': {
//         'fill-color': ['step',
//           ['get', 'TEMP'], 'red',
//           0, 'blue', 1, 'green', 10, 'orange'],
//         'fill-opacity': 0.5
//       },
//     });
//   }
//   else if (variable === 'windspeed_10m') {
//     map.addLayer({
//       'id': 'weather_polygons',
//       'type': 'fill',
//       'source': 'weather',
//       filter: ['has', 'TEMP'],
//       'paint': {
//         'fill-color': ['step',
//           ['get', 'TEMP'], 'red',
//           10, 'blue', 20, 'green', 30, 'orange'],
//         'fill-opacity': 0.5
//       },
//     });
//   }
//   //console.log(polygon.features)
// }



//Add event listener which returns map view to full screen on button click
document.getElementById('returnbutton').addEventListener('click', () => {
  map.flyTo({
    center: [-79.266, 43.926],
    zoom: 8.65,
    bearing: -17.7,
    essential: true
  });
});

//Change map layer display based on check box using setlayoutproperty
document.getElementById('layercheck1').addEventListener('change', (e) => {
  map.setLayoutProperty(
    'toronto_bicycle_shop',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bicycle_shop_clustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bicycle_shop_unclustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bicycle_shop_clustered_count',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bicycle_shop',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bicycle_shop_clustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bicycle_shop_unclustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bicycle_shop_cluster_count',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
});

document.getElementById('layercheck2').addEventListener('change', (e) => {
  map.setLayoutProperty(
    'toronto_bikeshare_stations',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bikeshare_clustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bikeshare_cluster_count',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bikeshare_unclustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
});

document.getElementById('layercheck3').addEventListener('change', (e) => {
  map.setLayoutProperty(
    'toronto_bicycle_parking',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bike_parking_clustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bike_parking_cluster_count',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'toronto_bike_parking_unclustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bike_parking',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bike_parking_clustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bike_parking_unclustered',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
  map.setLayoutProperty(
    'gta_bike_parking_cluster_count',
    'visibility',
    e.target.checked ? 'visible' : 'none'
  );
});

//assign 'label_shops' variable to HTML element with 'label_shops' id
const label_shops = document.getElementById('label_shops'); //assign 'item_shops' variable to a created 'section'
const item_shops = document.createElement('div'); //assign 'key_shops' variable to a created 'span' (i.e. space into which content can be inserted)
const key_shops = document.createElement('span'); //specify the class of 'key_shops' span as 'label-key-shops' such that its style is defined by the latter in css
key_shops.className = 'label-key-shops'; //specify the background color of 'key_shops' span
key_shops.style.backgroundColor = '#AC1C54'; //assign 'value_shops' variable to a created 'span' (i.e. space into which content can be inserted)
const value_shops = document.createElement('span');  //insert text into 'value_shops' span
value_shops.innerHTML = 'Bike Shops' //add 'key_points' span to the created section 'item_shops'
item_shops.appendChild(key_shops);  //add 'value_shops' span to the created section 'item_shops'
item_shops.appendChild(value_shops);  //add 'item_shops' section into the HTML element assigned to 'label_shops' variable
label_shops.appendChild(item_shops);

//assign 'label_parking' variable to HTML element with 'label_parking' id
const label_parking = document.getElementById('label_parking'); //assign 'item_parking' variable to a created 'section'
const item_parking = document.createElement('div'); //assign 'key_parking' variable to a created 'span' (i.e. space into which content can be inserted)
const key_parking = document.createElement('span');  //specify the class of 'key_parking' span as 'label-key-parking' such that its style is defined by the latter in css
key_parking.className = 'label-key-parking';  //specify the background color of 'key_parking' span
key_parking.style.backgroundColor = '#84BCE4';  //assign 'value_parking' variable to a created 'span' (i.e. space into which content can be inserted)
const value_parking = document.createElement('span'); //insert text into 'value_parking' span
value_parking.innerHTML = 'Bike Parkings' //add 'key_parking' span to the created section 'item_parking'
item_parking.appendChild(key_parking);  //add 'value_parking' span to the created section 'item_parking'
item_parking.appendChild(value_parking); //add 'item_parking' section into the HTML element assigned to 'label_parking' variable
label_parking.appendChild(item_parking);

//assign 'label_bikeshare' variable to HTML element with 'label_bikeshare' id
const label_bikeshare = document.getElementById('label_bikeshare'); //assign 'item_bikeshare' variable to a created 'section'
const item_bikeshare = document.createElement('div'); //assign 'key_bikeshare' variable to a created 'span' (i.e. space into which content can be inserted)
const key_bikeshare = document.createElement('span'); //specify the class of 'key_bikeshare' span as 'label-key-bikeshare' such that its style is defined by the latter in css
key_bikeshare.className = 'label-key-bikeshare'; //specify the background color of 'key_bikeshare' span
key_bikeshare.style.backgroundColor = '#147453'; //assign 'value_bikeshare' variable to a created 'span' (i.e. space into which content can be inserted)
const value_bikeshare = document.createElement('span'); //insert text into 'value_bikeshare' span
value_bikeshare.innerHTML = 'Toronto Bikeshare' //add 'key_bikeshare' span to the created section 'item_bikeshare'
item_bikeshare.appendChild(key_bikeshare); //add 'value_bikeshare' span to the created section 'item_bikeshare'
item_bikeshare.appendChild(value_bikeshare); //add 'item_bikeshare' section into the HTML element assigned to 'label_bikeshare' variable
label_bikeshare.appendChild(item_bikeshare);


// document.getElementById('layercheck4').addEventListener('change', (e) => {
//   if (document.getElementById('layercheck4').checked==true){
//     weather_api('temperature_2m')
//   }
//   if (document.getElementById('layercheck4').checked==false){
//     map.removeLayer('weather_polygons');
//     map.removeSource('weather');
//   }
// });

document.getElementById("weathertype").addEventListener('change', (e) => {
  weathertype = document.getElementById('weather').value;
  if (map.getLayer('weather_polygons')) {
    map.removeLayer('weather_polygons');
  }
  if (map.getSource('weather')) {
    map.removeSource('weather');
  }
  if (legend_colorbar.hasChildNodes()){
    legend_colorbar.removeChild(legend_colorbar.lastElementChild)
  }
  legend_weather_title.innerHTML=''
  if (weathertype == 'Temperature') {
    weather_api('temperature_2m');
    const legend_colorbar = document.getElementById('legend_colorbar');
    const colorbar = document.createElement('img');
    colorbar.src="https://ireo00.github.io/GTAccesstoCycling/Data/temperature_colorbar.png";
    colorbar.style.height = '200px';
    colorbar.style.width = 'auto';
    legend_colorbar.appendChild(colorbar);
    const legend_weather_title = document.getElementById('legend_weather_title');
    legend_weather_title.innerHTML='Temperature at 2m above ground'
  } 
  else if (weathertype == 'Precipitation') {
    weather_api('precipitation');
    const legend_colorbar = document.getElementById('legend_colorbar');
    // if (legend_colorbar.hasChildNodes()){
    //   legend_colorbar.removeChild(legend_colorbar.lastElementChild)
    // }
    const colorbar = document.createElement('img');
    colorbar.src="https://ireo00.github.io/GTAccesstoCycling/Data/precipitation_colorbar.png";
    colorbar.style.height = '200px';
    colorbar.style.width = 'auto';
    legend_colorbar.appendChild(colorbar);
    const legend_weather_title = document.getElementById('legend_weather_title');
    legend_weather_title.innerHTML='Total precipitation sum of preceding hour'
  }
  else if (weathertype == 'Snowfall') {
    weather_api('snowfall');
    const legend_colorbar = document.getElementById('legend_colorbar');
    // if (legend_colorbar.hasChildNodes()){
    //   legend_colorbar.removeChild(legend_colorbar.lastElementChild)
    // }
    const colorbar = document.createElement('img');
    colorbar.src="https://ireo00.github.io/GTAccesstoCycling/Data/snowfall_colorbar.png";
    colorbar.style.height = '200px';
    colorbar.style.width = 'auto';
    legend_colorbar.appendChild(colorbar);
    const legend_weather_title = document.getElementById('legend_weather_title');
    legend_weather_title.innerHTML='Total snowfall sum of preceding hour'
  }
  else if (weathertype == 'Wind Speed') {
    weather_api('windspeed_10m')
    const legend_colorbar = document.getElementById('legend_colorbar');
    // if (legend_colorbar.hasChildNodes()){
    //   legend_colorbar.removeChild(legend_colorbar.lastElementChild)
    // }
    const colorbar = document.createElement('img');
    colorbar.src="https://ireo00.github.io/GTAccesstoCycling/Data/windspeed_colorbar.png";
    colorbar.style.height = '200px';
    colorbar.style.width = 'auto';
    legend_colorbar.appendChild(colorbar);
    const legend_weather_title = document.getElementById('legend_weather_title');
    legend_weather_title.innerHTML='Windspeed at 10m above ground'
  }


});


//Filter data layer to show selected bike lane type from dropdown selection
let tobikelane;

document.getElementById("tobikelanetype").addEventListener('change', (e) => {
  tobikelane = document.getElementById('bikelane').value;

  // console.log(tobikelane);

  // if (tobikelane == 'All') {
  //   map.setLayoutProperty(
  //     'toronto_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'york_region_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'peel_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'durham_region_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'ajax_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'whitby_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'milton_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'burlington_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'oakvill_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'traffic',
  //     'visibility',
  //     'none'
  //   );
  //   map.setFilter(
  //     'toronto_bikeways',
  //     ['has', 'Classification'] //returns all lines from layer that have a value in Classification field
  //   );
    console.log(tobikelane);
    const legend_discrete = document.getElementById('legend_discrete');
    // if (legend_discrete.hasChildNodes()){
    //   legend_discrete.removeChild(legend_discrete.lastElementChild)
    //   console.log(legend_discrete.lastElementChild)
    // }
    while (legend_discrete.firstChild) {
      legend_discrete.removeChild(legend_discrete.lastChild);
    }
    // const legend_bikeways_title = document.getElementById('legend_bikeways_title');
    // legend_bikeways_title.innerHTML=''
    // const legend_collapsible = document.getElementById('legend_collapsible');
    // if (legend_collapsible.hasChildNodes()==false){
    //   legend_collapsible.appendChild(document.createTextNode("test content"))
    // }
    if (tobikelane == 'All') {
      bikeways_legend()
      const legend_bikeways_title = document.getElementById('legend_bikeways_title');
      legend_bikeways_title.innerHTML='Bikeways'
      map.setLayoutProperty(
        'toronto_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'york_region_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'peel_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'durham_region_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'ajax_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'whitby_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'milton_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'burlington_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'oakvill_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'traffic',
        'visibility',
        'none'
      );
        map.setFilter(
            'toronto_bikeways',
            ['has', 'Classification'] //returns all lines from layer that have a value in type field (type!!)
        );
        map.setFilter(
          'york_region_bikeways',
          ['has', 'Classification'] //returns all lines from layer that have a value in Classification field
        );
    
        map.setFilter(
          'peel_bikeways',
          ['has', 'Classification'] //returns all lines from layer that have a value in Classification field
        );
    
        map.setFilter(
          'durham_region_bikeways',
          ['has', 'classification'] //returns all lines from layer that have a value in Name field ['has', 'Name']
        );
    
        map.setFilter(
          'ajax_bikeways',
          ['has', 'classification'] //returns all lines from layer that have a value in Classification field
        );
    
        map.setFilter(
          'whitby_bikeways',
          ['has', 'classification'] //returns all lines from layer that have a value in Classification field
        );
    
        map.setFilter(
          'milton_bikeways',
          ['has', 'classification'] //returns all lines from layer that have a value in Classification field
        );
    
        map.setFilter(
          'burlington_bikeways',
          ['has', 'Classification'] //returns all lines from layer that have a value in Classification field
        );
    
        map.setFilter(
          'oakvill_bikeways',
          ['has', 'Classification'] //returns all lines from layer that have a value in Classification field
        );
    } 
    else if (tobikelane != 'All' && tobikelane != 'Traffic') {
      bikeways_legend()
      // console.log(document.getElementById('legend_bikeways_title'))
      const legend_bikeways_title = document.getElementById('legend_bikeways_title');
      legend_bikeways_title.innerHTML='Bikeways'
      map.setLayoutProperty(
        'toronto_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'york_region_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'peel_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'durham_region_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'ajax_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'whitby_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'milton_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'burlington_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'oakvill_bikeways',
        'visibility',
        'visible'
      );
      map.setLayoutProperty(
        'traffic',
        'visibility',
        'none'
      );
        // map.setFilter(
        //     'toronto_bikeways',
        //     ['==', ['get', 'type'], tobikelane] //returns polygon with type value that matches dropdown selection
        // );
        map.setFilter(
          'toronto_bikeways',
          ['==', ['get', 'Classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'york_region_bikeways',
          ['==', ['get', 'Classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'peel_bikeways',
          ['==', ['get', 'Classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'durham_region_bikeways',
          ['==', ['get', 'classification'], tobikelane] //returns polygon with Name value that matches dropdown selection ['==', ['get', 'Name'], tobikelane]
        );
        map.setFilter(
          'ajax_bikeways',
          ['==', ['get', 'classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'whitby_bikeways',
          ['==', ['get', 'classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'milton_bikeways',
          ['==', ['get', 'classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'burlington_bikeways',
          ['==', ['get', 'Classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
        map.setFilter(
          'oakvill_bikeways',
          ['==', ['get', 'Classification'], tobikelane] //returns polygon with Classification value that matches dropdown selection
        );
    }
    else if (tobikelane == 'Traffic') {
      traffic_legend()
      const legend_bikeways_title = document.getElementById('legend_bikeways_title');
      legend_bikeways_title.innerHTML='Traffic'
      map.setLayoutProperty(
        'traffic',
        'visibility',
        'visible'
      );
      
      map.setLayoutProperty(
        'toronto_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'york_region_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'peel_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'durham_region_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'ajax_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'whitby_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'milton_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'burlington_bikeways',
        'visibility',
        'none'
      );
      map.setLayoutProperty(
        'oakvill_bikeways',
        'visibility',
        'none'
      );

    }



  
  // else if (tobikelane != 'All' && tobikelane != 'Traffic') {
  //   map.setLayoutProperty(
  //     'toronto_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'york_region_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'peel_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'durham_region_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'ajax_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'whitby_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'milton_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'burlington_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'oakvill_bikeways',
  //     'visibility',
  //     'visible'
  //   );
  //   map.setLayoutProperty(
  //     'traffic',
  //     'visibility',
  //     'none'
  //   );
    
  // }
  else if (tobikelane == 'Traffic') {
    map.setLayoutProperty(
      'traffic',
      'visibility',
      'visible'
    );

    map.setLayoutProperty(
      'toronto_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'york_region_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'peel_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'durham_region_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'ajax_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'whitby_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'milton_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'burlington_bikeways',
      'visibility',
      'none'
    );
    map.setLayoutProperty(
      'oakvill_bikeways',
      'visibility',
      'none'
    );
  }
});



legend_content.style.display='block'
const legend_bikeways_title = document.getElementById('legend_bikeways_title');
legend_bikeways_title.innerHTML='Bikeways'
legend_collapsible = document.getElementById('legend_collapsible');
if (legend_collapsible.hasChildNodes()==false){
  legend_collapsible.appendChild(document.createTextNode("Collapse Legend"))
}
// const legend_content = document.getElementById('legend_content');
//legend_content.style.display='block'
// console.log(legend_content.style.display)
bikeways_legend()



function bikeways_legend(){
  const legendlabels = [
    'Bike Lane',
    'Multi-use Trail', 
    'Sharrows', 
    'Cycle Track',
    'Paved Shoulder',
    'Hiking/Park Trail'
  ];

  const legendcolours = [
    '#FC6468',
    '#0072B2',
    '#8B4DAB',
    '#FFB900',
    '#C11F73',
    '#009E73'
  ];

  //Declare legend variable using legend div tag
  const legend_discrete = document.getElementById('legend_discrete');
  const legend_bikeways_title = document.getElementById('legend_bikeways_title');
  legend_bikeways_title.innerHTML='Bikeways'
  //For each layer create a block to put the colour and label in
  legendlabels.forEach((label, i) => {
    const color = legendcolours[i];

    const item = document.createElement('div'); 
    const key = document.createElement('span'); 

    key.className = 'legend-key'; 
    key.style.backgroundColor = color; 

    const value = document.createElement('span'); 
    value.innerHTML = `${label}`; 

    item.appendChild(key); 
    item.appendChild(value); 

    legend_discrete.appendChild(item); 
  });
}

function traffic_legend(){

  const legendlabels = [
    'Low',
    'Moderate', 
    'Heavy', 
    'Severe'
  ];

  const legendcolours = [
    'green',
    '#ffff00',
    'orange',
    'red'
  ];

  //Declare legend variable using legend div tag
  const legend_discrete = document.getElementById('legend_discrete');
  // var collapse_button = document.createElement("BUTTON");
  // collapse_button.setAttribute("id","collapsible");
  // collapse_button.setAttribute("class","collapsible");
  // collapse_button.appendChild(document.createTextNode("test content"))
  // legend_discrete.appendChild(collapse_button); 
  // const legend_bikeways_title = document.getElementById('legend_bikeways_title');
  // legend_bikeways_title.innerHTML='Traffic'
  //For each layer create a block to put the colour and label in
  legendlabels.forEach((label, i) => {
    const color = legendcolours[i];

    const item = document.createElement('div'); 
    const key = document.createElement('span'); 

    key.className = 'legend-key'; 
    key.style.backgroundColor = color; 

    const value = document.createElement('span'); 
    value.innerHTML = `${label}`; 

    item.appendChild(key); 
    item.appendChild(value); 
    legend_discrete.appendChild(item); 
  });
}

document.getElementById('legend_collapsible').addEventListener('click',(e) => {   
  var legend_content = document.getElementById('legend_content');
  //if this content was already open...
  if (legend_content.style.display === "block") {
    //close it
    legend_content.style.display = "none";
    legend_collapsible.innerText= "Expand Legend";
  }
  else {
    //close it
    legend_content.style.display = "block";
    legend_collapsible.innerText= "Collapse Legend";
  }
})
