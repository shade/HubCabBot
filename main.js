var fs = require('fs');
var async = require('async');
var ON_DEATH = require('DEATH');
var $ = require('./Ajax');
/*
	* Fetch as many github repos as possible
	* Sort by starred, get anything >20 stars (small repos tend to get removed)
	* Fetch the readmes from each repo
	* Find the plaintext in the readmes
	* Search the plaintext for spelling errors
	* Fork and commit if there are spelling errors
*/


/*
* All the repos that have readmes with bad spelling are pushed here as objects
* {
	  readme: 'read me data here rawly',
	  repo: {{GITHUB REPO OBJECT}}
  }
*
*/
var REPOS_WITH_BAD_SPELLINGS = [];

//Since ^ is the most important thing we gotta keep it on death
ON_DEATH(() => {

		return fs.writeFileSync('./savedRepos.json',JSON.stringify(REPOS_WITH_BAD_SPELLINGS));
});



/*
* Generator used to fetch the next batch of repositories
*/

function* fetchRepos(){
	//I'm pretty sure the first thousand repos are well maintained
	var _ptr = 1000;

	//Yield a new promise for fetching the repos
	while(true){

		yield new Promise((resolve,reject) => {
			console.log('Promising some repos')
			$.get({
				url: 'https://api.github.com/repositories?since='+_ptr,
				json: true,
				done: (repos) => {
					console.log('Got the repos, now to filter')
					//Set the pointer to the new latest value
					_ptr = repos[repos.length - 1].id;
					resolve(repos);
				},
				error: () => {
					reject();
				}
			});

		});

	}
}


/*
*	A function used to find and filter repos
*/

function filterRepos(repoArr){

	//Here's where we're gonna push in the repos to check for stars
	var _cbArr = [];

	repoArr.forEach((repo) => {
		//OoOoOo we're pushing in a function, JS is so cool
		_cbArr.push((cb) => {
			console.log('Fetching '+ repo.full_name);
			$.get({
				url: 'https://api.github.com/repos/' + repo.full_name,
				json: true,
				done: (repo) => {
					setTimeout(function(){
						if(repo.stargazers_count > 20){
							cb&&cb(null,repo);
						}else{
							cb&&cb(null,undefined);
						}
					},1000);
				}
			});

		});
	});

	return new Promise((resolve,reject) => {
		async.series(_cbArr,(err,data) => {
			console.log('done waterfalling');
			var repoArr = [];
			data.forEach((repo) => {
				if(repo){
					console.log('Found repo '+repo.full_name);
					repoArr.push(repo);
				}
			});
			err
			resolve(repoArr);
		});


	});


}


/*
* Here's the module to get and analyze the README
*/

function readMe(repos,cb){
	grabReadMes(repos).then(function(fRepos_withReadMes){
		//Analyze READMEs here as well
		REPOS_WITH_BAD_SPELLINGS.push(fRepos_withReadMes);
		cb();
	});

}

function grabReadMes(repos){

	//Damn, we need to use async with a callback array
	var _cbArr = [];

	//push each readme fetching function into the callback array

	repos.forEach((repo) => {
		_cbArr.push((cb) => {

			//Grab the readMe
			$.get({
				url: 'https://raw.githubusercontent.com/'+repo.full_name+'/master/README.md',
				json: false,
				done: (readme) => {
					//return the readme data
					cb({
						readme: readme,
						repo: repo
					});
				}
			});

		});

	});

	return new Promise(function(resolve,reject){
		async.parallel(_cbArr,function(err,data){
			resolve(data);
		});
	});


}




/*
* Let's begin here
*/
(function main(){
	var _findRepo = fetchRepos();
	var _finding = false;

	var _start = function(){

			console.log('Eating some repos ... ');

			//Generate a repo promise, filter and grab the readme from that 
			_findRepo.next().value.then((repos) => {
				console.log('Fetched the Repos')
				filterRepos(repos).then((fRepos) => {
					readMe(fRepos,() => {
						console.log('Finished eating a batch of repos, yum');
						_finding = false;
					});
				});
			});

	}
	//Repeats once every minute
	setInterval(() => {

		//Maybe a goto would be better than this whole setInterval + validation thing
		if(!_finding){
			
			_finding = true;
			_start();
		}

	},120000);
	_start();
})();


