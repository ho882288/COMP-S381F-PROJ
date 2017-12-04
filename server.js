var http = require('http');
var url  = require('url');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://admin:admin@ds113746.mlab.com:13746/s1143626';
var express = require('express');
var app = express();
var session = require('cookie-session');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');

app.use(session({name: 'session',keys: ['SECRETKEY1','SECRETKEY2']}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(fileUpload());

app.get('/',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		res.redirect('/main');
	}
});

app.get('/register', function(req,res,callback){
	res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', function(req, res) {
	var temp = {"name" : req.body.name};
	MongoClient.connect(mongourl,function(err,db) {
	assert.equal(null,err);
		checkUserInfo(db,temp,function(result){
			if(result == null){
				createUserAccount(db,req.body.name,req.body.password,function(result) {
						db.close();
						res.redirect('/');
					}
				);
			}else{
				res.redirect('/register');
			}	});	});});

app.post('/login',function(req,res) {
		MongoClient.connect(mongourl,function(err,db) {
			assert.equal(err,null);
			checkUserInfo(db,{"name" : req.body.name},function(result){
				if (result != null){
					if(result.name == req.body.name && result.password == req.body.password){
						req.session.authenticated = true;
						req.session.username = req.body.name;
						res.redirect('/');
					} else {
						res.redirect('/');
					}}
					});
					});
			});

app.get('/logout', function(req,res,next) {
	req.session = null;
	res.redirect('/');});

app.get('/create',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
		res.sendFile(__dirname + '/public/create.html');
	}
});

app.get('/main', function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
	  var temp = req.query;
  	  MongoClient.connect(mongourl,function(err,db) {
	  	assert.equal(err,null);
			getAllRestaurant(db,temp,function(restaurantInfo) {
				db.close();
				res.render('main.ejs',{restaurantInfo:restaurantInfo,user:req.session.username,temp:JSON.stringify(temp)});
		});
	});
	}
});

app.post('/create', function(req, res) {
	var temp = {"name" : req.body.name};
	MongoClient.connect(mongourl,function(err,db) {
	  assert.equal(null,err);
    	  checkRestaurant(db,temp,function(restaurantInfo) {

	    if(restaurantInfo == null){
				createRestaurant(db, req.session.username, req.body.name, req.body.borough, req.body.cuisine, req.files.photo,
					req.body.street, req.body.building, req.body.zipcode, req.body.lon, req.body.lat,function(result) { db.close();
		  if (result.insertedId != null) {
			res.status(200);
			res.redirect('/');
		  } else {
			res.status(500);
			res.end(JSON.stringify(result));}});
	     } else {
			res.redirect('/create'); }
	    });
	});
});

app.get('/update', function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
	 	var temp = req.query.id;
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		checkRestaurantById(db,temp,function(restaurantInfo) {
			db.close();
			res.render('update.ejs',{result:restaurantInfo,user:req.session.username});
		});
		});
	}
});

app.post('/update', function(req, res) {
	MongoClient.connect(mongourl,function(err,db) {
	assert.equal(null,err);
		updateRestaurant(db,req.body.restaurantId, req.session.username, req.body.name, req.body.borough, req.body.cuisine, req.files.photo,
			req.body.street, req.body.building, req.body.zipcode, req.body.lon, req.body.lat,function(result) {
		 		db.close();
				res.status(200);
				res.redirect('/');
			}
		);
	});
});


app.get('/display', function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		checkRestaurantById(db,req.query.id,function(restaurantInfo) {
			db.close();
			res.render('display.ejs',{result:restaurantInfo,user:req.session.username});
		});
		});
	}
});


app.get('/rate',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
	 	var temp = req.query.id;
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		checkRestaurantById(db,temp,function(restaurantInfo) {
			db.close();
			res.render('rate.ejs',{result:restaurantInfo,restaurantId:temp,user:req.session.username});
		});
		});
	}
	}
);

app.post('/rate',function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		rateRestaurant(db,req.body.restaurantId,req.body.rate,req.session.username,
		function(result) {
			  db.close();
			  res.redirect('/display?id=' + req.body.restaurantId);
		}
	);
      });
});


app.get('/gmap',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
	res.render("map.ejs",{lat:req.query.lat,lon:req.query.lon,title:req.query.title});
	}
});


app.get('/delete', function(req, res,callback) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(null,err);
			deleteRestaurant(db,req.query.id,req.session.username,
				function(result) {
					db.close();
					if(result.result.n ==1 )
						res.redirect('/');
					else {
						res.set('Content-Type','text/html');
						res.status(200).write('<html><body>');
						res.write('<p>You have no permission to delete</p>');
						res.end('<a href=/>Main</a></body></html>');
					}
				}
			);
		});
	}
});


app.get('/search', function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	} else {
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		findDistinct(db,"borough",function(borough) {
			findDistinct(db,"name",function(name) {
				findDistinct(db,"cuisine",function(cuisine) {
					findDistinct(db,"owner",function(owner) {
						findDistinct(db,"address.street",function(street){
							findDistinct(db,"address.building",function(building){
								findDistinct(db,"address.zipcode",function(zipcode){
									findDistinct(db,"grades.score",function(score){
										res.render('search.ejs',{borough:borough,name:name,cuisine:cuisine,owner:owner,street:street,building:building,zipcode:zipcode,score:score});
										db.close();
									});
								});
							});
						});
					});
				});
			});
		});
		});
	}
});

app.post('/search',function(req,res) {
	var type = ""+req.body.type;
	var option = ""+req.body.option;
	var query = {};
	query[type] = option;
	MongoClient.connect(mongourl,function(err,db) {
	assert.equal(err,null);
	getAllRestaurant(db,query,function(restaurantInfo) {
		db.close();
		res.render('result.ejs',{restaurantInfo:restaurantInfo,option:option});

		}
	);
      });
});

app.get('/api/restaurant/read/:field/:value', function(req,res) {
	  var criteria = req.query;

  	  MongoClient.connect(mongourl,function(err,db) {
	  	assert.equal(err,null);
		var field = req.params.field;
		var value = req.params.value;
		var criteria;
		if (field == "name"){
			criteria = {"name":value};
		}else if (field == "borough"){
			criteria = {"borough":value};
		}else if (field == "cuisine"){
			criteria == {"cuisine":value};
		}
		getAllRestaurant(db,criteria,function(restaurantInfo) {
			db.close();
			res.end(JSON.stringify(restaurantInfo));
		});
	});
});



function findDistinct(db,type,callback) {
		db.collection('restaurantDoc').distinct(type,function(err,result) {
			assert.equal(err,null);
			callback(result);
		}
	);
}

function checkUserInfo(db,temp,callback) {
	db.collection('userAccount').findOne(temp,function(err,result) {
		assert.equal(err,null);
		callback(result);})
}

function createUserAccount(db,name,password,callback) {
	db.collection('userAccount').insertOne({"name" : name, "password" : password}, function(err,result) {
		if (err) {result = err;}
		callback(result);
	});
}

function createRestaurant(db,owner,name,borough,cuisine,file,street,building,zipcode,lon,lat,callback) {
	if(file != null){
	db.collection('restaurantDoc').insertOne({
	"owner" : owner,
	"borough" : borough,
	"name" : name,
 	"cuisine" : cuisine,
	"photo" : new Buffer(file.data).toString('base64'),
	"photoMimetype" : file.mimetype,
	"address" :{
		"street" : street,
		"building" : building,
		"zipcode" : zipcode,
		"coord" : [lon,lat]
	},},function(err,result) {
		if (err) {result = err;}
		callback(result);
		}
	);}else {
		db.collection('restaurantDoc').insertOne({
		"owner" : owner,
		"borough" : borough,
		"name" : name,
	 	"cuisine" : cuisine,
		"address" :{
			"street" : street,
			"building" : building,
			"zipcode" : zipcode,
			"coord" : [lon,lat]
		},},function(err,result) {
			if (err) {result = err;}
			callback(result);
	});
}}


function updateRestaurant(db,id,owner,name,borough,cuisine,file,street,building,zipcode,lon,lat,callback) {
	if(file != null){
	db.collection('restaurantDoc').update({"_id": ObjectId(id)},{$set:{
	"name" : name,
	"borough" : borough,
 	"cuisine" : cuisine,
	"address" :{
		"street" : street,
		"building" : building,
		"zipcode" : zipcode,
		"coord" : [lon,lat]
	},
	"photo" : new Buffer(file.data).toString('base64'),
	"photoMimetype" : file.mimetype
	}}, function(err,result) {
		if (err) {result = err;}
		callback(result);
		}
	);
	}else{
	   db.collection('restaurantDoc').update({"_id": ObjectId(id)},{$set:{
		"name" : name,
		"borough" : borough,
 		"cuisine" : cuisine,
		"address" :{
			"street" : street,
			"building" : building,
			"zipcode" : zipcode,
			"coord" : [lon,lat]
		},
	    }}, function(err,result) {
				if (err) {result = err;}
				callback(result);	}
	);
    }
}

function rateRestaurant(db,id,rate,owner,callback) {
	db.collection('restaurantDoc').update({"_id" : ObjectId(id)},{$push:{
		"grades": {
			"user" : owner,
			"score" : rate}
	}}, function(err,result) {
			if (err) {result = err;}
			callback(result);}
	);
}

function checkRestaurant(db,type,callback) {
		db.collection('restaurantDoc').findOne(type,function(err,result) {
			assert.equal(err,null);
			callback(result);
		}
	);
}


function checkRestaurantById(db,temp,callback) {
		db.collection('restaurantDoc').findOne({"_id": ObjectId(temp)},function(err,result) {
			assert.equal(err,null);
			callback(result);
		});
}

function getAllRestaurant(db,temp,callback) {
		var restaurantInfo = [];
		db.collection('restaurantDoc').find(temp,function(err,result) {
			assert.equal(err,null);
			result.each(function(err,doc) {
				if (doc != null) {
					restaurantInfo.push(doc);
				} else {
					callback(restaurantInfo);}
			});
		})
}

function deleteRestaurant(db,id,owner,callback) {
	db.collection('restaurantDoc').remove({"_id": ObjectId(id),"owner" : owner},
		function(err,result) {
			if (err) {result = err;}
				callback(result);
		}
	);
}


app.listen(process.env.PORT || 8099);
