angular-dpd
=================

A plugin for Angular that allows for easy interaction with deployd.
Usage is the same as the default dpd.js file, but requires configuration of the necessary collections.
Extra 'save' helper function added that will POST if the object has no 'id' and will put if it does.
Also includes a cache for your objects that have been retrieved for easy insertion into the DOM.
This allows you to quickly wire up your angular app with deployd and keep all of your files static so the deployd api can spend it's time serving data instead of a dynamic .js file.

Example usage
---------------------

```javascript
var app = angular.module('myApp',['dpd']);

// Configuration:
app.value('dpdConfig',['categories']);
// or
app.value('dpdConfig', { 
	collections: ['categories'], 
	serverRoot: 'http://someotherserver.com/', // optional, defaults to same server
	socketOptions: { reconnectionDelayMax: 3000 }, // optional socket io additional configuration
	useSocketIo: true // optional, defaults to false
	noCache: true // optional, defaults to false (false means that caching is enabled, true means it disabled)
});


app.controller('bodyController',function($scope, dpd){

	dpd.categories.get();
	
	dpd.categories.get('414b9c5cc315485d');
	
	// Example with an [advanced query](http://docs.deployd.com/docs/collections/reference/querying-collections.md#s-Advanced%20Queries-2035):
	dpd.categories.get($sort: {name: 1}, $limit: 10, rightsLevel: {$gt:0}};
	
	// Promises are supported:
	dpd.categories.post({"value":"cat1","typeId":"987ad2e6d2bdaa9d"})
		.success(function (result) {
			// use result
		})
		.error(function (err) {
			// on error
		})
		.finally(function () {
			// finally
		});
	
	dpd.categories.put('414b9c5cc315485d',{"value":"cat123"});
	
	dpd.categories.del('414b9c5cc315485d');
	
	// You can also use a callback instead of using promises if you prefer:
	dpd.categories.save({"value":"save POST","typeId":"987ad2e6d2bdaa9d"},function(result){
	
		result.value = "save PUT";
		
		dpd.categories.save(result);
	});

});
```

Cache
---------------------

Unless caching is disabled via configuration, the dpd object comes with a cache object that will persist after calling a get().

```javascript	
// will return every category that is currently in the cache
dpd.categories.cache.all 

// will return a specific category from the cache
dpd.categories.cache.get('414b9c5cc315485d') 

// will fetch a single category from the database and if it's in the cache, update the cached item.
// If it's not in the cache it will be added.
dpd.categories.get(id,function(result){ ... });

// will add a new category to the the database and on success will add it to the cache
dpd.categories.post({..},function(result){ ... });

// will update a category in the the database and on success will update it in the cache 
// If it's not in the cache it will be added.
dpd.categories.put(id, {..},function(result){ ... });

// will delete a category from the the database and on success will delete it from the cache
dpd.categories.del(id,function(){ ... });

// login a user
dpd.users.exec('login', { username: 'user', password: 'pass' }).success(function(session) { }).error(function(err) { });
```

Here is an example where you can query objects from the table and immediately put them on the screen.

```html
<!DOCTYPE html>
<html ng-app="myApp">
	<head>
		<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/angularjs/1.0.6/angular.min.js"></script>
		<script type="text/javascript" src="angular-dpd/angular-dpd.js"></script>
		<script type="text/javascript" src="app.js"></script>
	</head>
	<body ng-controller="bodyController">
		<ul ng-init="dpd.categories.get()">
			<li ng-repeat="c in dpd.categories.cache.all">
				{{c.value}}
			</li>
		</ul>
	</body>
</html>
```
	
Socket.IO
---------------------

If socket.io is enabled in the configuration, it can be used like this:

```javascript
app.controller('bodyController',function($scope, dpd){
	dpd.categories.on($scope, "changed", function (result) { // this handles "categories:changed"
		console.log("event fired");
	}
	// or
	dpd.on($scope, "categories:changed", function (result) {
		console.log("event fired");
	}
}
```

For low-level access, the raw socket is exposed as `dpd.socket.rawSocket`.

Note: We inject $scope in the call so that the library can automatically remove the events if the $scope is $destroyed (such as when a route change occurs).
	
