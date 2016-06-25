var fs = require('fs');
var Git = require('nodegit');
var SpellCheck = require('spellchecker');
var Async = require('async');
var ON_DEATH = require('DEATH');

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

	fs.writeFileSync('./savedRepos.json',JSON.stringify(REPOS_WITH_BAD_SPELLINGS));

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

			$.get({
				url: 'https://api.github.com/repositories?since='+_ptr,
				json: true,
				done: (repos) => {
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

			$.get({
				url: 'https://api.github.com/repos/' + repo.full_name,
				done: (repo) => {
					if(repo.stargazers_count > 20){
						cb(null,repo);
					}else{
						cb(null,undefined);
					}
				}
			});

		});
	});


	return new Promise((resolve,reject) => {
		async.parallel(_cbArr,(err,data) => {
			data.forEach((repo) => {
				if(repo){
					console.log('Found repo '+repo.full_name);
				}
			});
		});


	});


}


/*
* Here's the module to get and analyze the README
*/

function readMe(repos,cb){
	grabReadMes(repos).then(function(fRepos_withReadMes){
		//Analyze READMEs here as well
		cb();
	});

}

function grabReadMes(repos){

	//Damn, we need to use async with a callback array
	var _cbArr = [];

	return new Promise(function(resolve,reject){


		repos.forEach((repo) => {


			//Grab the readMe
			$.get({
				url: 'https://raw.githubusercontent.com/'+repo.full_name+'/master/README.md',
				json: false,
				done: (readMe) => {
					resolve();
				}
			});
		});
	});


}




/*
* Let's begin here
*/
(function main(){
	var _findRepo = fetchRepos();
	var _finding = false;

	//Repeats once every minute
	setInterval(() => {

		//Maybe a goto would be better than this whole setInterval + validation thing
		if(!_finding){
			
			console.log('Eating some repos ᗧ • • • • • • • ');
			_finding = true;

			_findRepo.next().then((repos) => {
				filterRepos(repos).then((fRepos) => {
					readMe(fRepos,() => {
						console.log('Finished eating a batch of repos, yum');
						_finding = false;
					});
				});
			});
		}

	},120000);

})();