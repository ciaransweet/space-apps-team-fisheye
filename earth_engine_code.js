var rgb = {min:0, max:3000, bands:['B4', 'B3', 'B2']}

var s2 = ee.ImageCollection('COPERNICUS/S2')
  .filterDate('2018-01-01', '2018-12-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .filterBounds(aoi)
  .select('B.*')

Map.addLayer(s2, rgb, 's2')

var months = ee.List.sequence(1,12,3).map(function(month) {
  var start = ee.Number(month)
  var end = start.add(3)
  return s2.filter(ee.Filter.calendarRange(start, end, 'month'))
  .median()
  .set('system:id', start.format('month_%d'))
})

// Map.addLayer(ee.Image(months.get(0)), rgb)
// Map.addLayer(ee.Image(months.get(1)), rgb)
// Map.addLayer(ee.Image(months.get(2)), rgb)
// Map.addLayer(ee.Image(months.get(3)), rgb)

//  ----------

var collect_bands = function(image, state) {
  return ee.Image(state).addBands(image)
}

var empty = ee.Image().select()

// var s2_mosaics = months.iterate(collect_bands, empty)
// s2_mosaics = ee.Image(s2_mosaics)

// this is another way to do the above

var s2_mosaics = months.iterate(function(image, state) {
  return ee.Image(state).addBands(image)
}, ee.Image().select())

print(s2_mosaics)

var l8_rgb = {min:0, max:3000, bands:['B4', 'B3', 'B2']}

var l8 = landsat8
  .filterDate('2019-01-01', '2019-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 10))
  .filterBounds(aoi)
  .select('B.*')


var srtm_threshold = function(image){
    var threshold = -1
    var elev_band = image.select('elevation')
    var greater_than_threshold = elev_band.gt(threshold)
    var land_masked = elev_band.updateMask(greater_than_threshold)
    var unmasked = land_masked.unmask()
    return unmasked.gt(0)
}
var srtm_masked = srtm_threshold(srtm)
Map.addLayer(srtm, {min:0, max:10, bands:'elevation'}, 'srtm')
Map.addLayer(srtm_masked, {min:0, max:1, bands:'elevation'}, 'srtm_masked')

// Load the Sentinel-1 ImageCollection.
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  // .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .filterDate('2018-01-01', '2018-12-31')
  .filterBounds(aoi)
  //.select('V.*')
  
var s1_months = ee.List.sequence(1,12,3).map(function(month) {
  var start = ee.Number(month)
  var end = start.add(3)
  return s1.filter(ee.Filter.calendarRange(start, end, 'month'))
  .mean() // to remove speckle
  .set('system:id', start.format('month_%d'))
})

var s1_vis = {min: [-25, -20, -25], max: [0, 10, 0]}
// var s1_vis = {min: -25, max: -5}

// Map.addLayer(ee.Image(s1_months.get(0)), s1_vis, 's1 first')
// Map.addLayer(ee.Image(s1_months.get(1)), s1_vis, 's1 second')
// Map.addLayer(ee.Image(s1_months.get(2)), s1_vis, 's1 third')
// Map.addLayer(ee.Image(s1_months.get(3)), s1_vis, 's1 fourth')


var s1_mosaics = s1_months.iterate(collect_bands, empty)
s1_mosaics = ee.Image(s1_mosaics)
Map.addLayer(s1_mosaics, s1_vis, 's1')


var all = s1_mosaics.addBands(s2_mosaics) // .addBands(srtm)
print(all)


var points = aquaculture.merge(water).merge(urban).merge(land)

print(points)
var training = all.sampleRegions({
  collection:points,
  properties: ['class'],
  scale:10
})


var classifier = ee.Classifier.randomForest(20).train(training, 'class')
var result = all.classify(classifier)
Map.addLayer(result, {min:0, max:3, palette:['blue', 'yellow', 'green', 'red']}, 'classification')

Map.centerObject(aoi, 13)


// // Classification of historical imagery

// //  2014
// var s2_2014 = ee.ImageCollection('COPERNICUS/S2')
//   .filterDate('2014-01-01', '2014-12-31')
//   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
//   .filterBounds(aoi)
//   .select('B.*')

// var s2_months_2014 = ee.List.sequence(1,12,3).map(function(month) {
//   var start = ee.Number(month)
//   var end = start.add(3)
//   return s2_2014.filter(ee.Filter.calendarRange(start, end, 'month'))
//   .median()
//   .set('system:id', start.format('month_%d'))
// })

// var s2_mosaics_2014 = s2_months_2014.iterate(function(image, state) {
//   return ee.Image(state).addBands(image)
// }, ee.Image().select())

// var s1_2014 = ee.ImageCollection('COPERNICUS/S1_GRD')
//   .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
//   .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
//   .filter(ee.Filter.eq('instrumentMode', 'IW'))
//   // .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
//   .filterDate('2014-01-01', '2014-12-31')
//   .filterBounds(aoi)
//   //.select('V.*')
  
// var s1_months_2014 = ee.List.sequence(1,12,3).map(function(month) {
//   var start = ee.Number(month)
//   var end = start.add(3)
//   return s1.filter(ee.Filter.calendarRange(start, end, 'month'))
//   .mean() // to remove speckle
//   .set('system:id', start.format('month_%d'))
// })

// var s1_mosaics_2014 = s1_months_2014.iterate(collect_bands, empty)
// s1_mosaics_2014 = ee.Image(s1_mosaics_2014)


// var all_2014 = s1_mosaics_2014.addBands(s2_mosaics_2014) // .addBands(srtm)
// print(all_2014)

// var result_2014 = all_2014.classify(classifier)
// Map.addLayer(result_2014, {min:0, max:3, palette:['blue', 'yellow', 'green', 'red']}, '2014_classification')





