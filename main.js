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
* All the repos that have readmes with bad spelling are pushed heres
*/
var REPOS_WITH_BAD_SPELLINGS = [];

//Since ^ is the most important thing

ON_DEATH(function(){

	fs.writeFileSync('./data.dat',REPOS_WITH_BAD_SPELLINGS);
});



/*
* Generator used to fetch the next batch of repositories
*/

function* fetchRepos(){
	//I'm pretty sure the first thousand repos are well maintained
	var _ptr = 1000;

	//Yield a new promise for fetching the repos
	while(true){

		yield new Promise(function(resolve,reject){

			$.get({
				url: 'https://api.github.com/repositories?since='+_ptr,
				json: true,
				done: function(repos){
					//Set the pointer to the new latest value
					_ptr = repos[repos.length - 1].id;
					resolve(repos);
				},
				error: function(){
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

	repoArr.forEach(function(repo){

		//OoOoOo we're pushing in a function, JS is so cool
		_cbArr.push(function(cb){

			$.get({
				url: 'https://api.github.com/repos/' + repo.full_name,
				function(repo){
					if(repo.stargazers_count > 20){
						cb(null,repo);
					}
				}
			});

		});
	});


	return new Promise(function(resolve,reject){
		async.parallel(function(err,cb){

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
	setInterval(function(){

		//Maybe a goto would be better than this whole setInterval + validation thing
		if(!_finding){
			
			console.log('Eating some repos ᗧ • • • • • • • ');
			_finding = true;

			_findRepo.next().then(function(repos){
				filterRepos(repos).then(function(fRepos){
					fRepos

					_finding = false;
				});
			});
		}

	},60000);

})();