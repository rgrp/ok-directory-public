
$(function(){
    var nd = new Pyk.newsDiscovery();
    nd.init();
});

var Pyk = {};
var id_tags;
var mapViewOn = false;
var articles = new Object();

Pyk.newsDiscovery = function(){

    this.init = function(){

        var that = this;

        // Load Facets & Render
        $.getJSON('res/data/facet.json', function(json){
            that.facet = json;
            that.renderColHeadings();
        });

        //Get the data from directory
        superagent.get(window.plp.config.directory)
          .set('Accept', 'application/json')
          .end(function(res){

            if (res.ok) {

              var graph = res.body["@graph"];
              that.data = graph;
              that.initCrossfilter();
              that.initMap();
              that.renderTags();
              that.initSearch();

            } else {

              alert('Oh no! error ' + res.text);

            }

        });

        //Load Data, Create Crossfilter & Render
        // $.getJSON("res/data/test_data.json", function(json){
        //     that.data = json;
        //     that.initCrossfilter();
        //     that.initMap();
        //     that.renderTags();
        //     that.initSearch();
        // });

    };


    this.renderColHeadings = function(){
        var h4s = $(".tag-holder h4"); // Capture all the required <h4> tags
        var f = this.facet.children;  // Get the data that corresponds to it
        for(var i in f) $(h4s[i]).html(f[i].label);
    };


    this.initCrossfilter = function(){

        // this.data contains the array of profiles.
        this.cf = {};
        this.cf.data = crossfilter(this.data);

        this.cf.id_dimension = this.cf.data.dimension(function(d){
            // return uuid
            var id = uuid.v4();
            articles[id] = d;
            return id;
        });

        this.cf.dd_dimension = this.cf.data.dimension(function(d){
            return d["about"]["address"]["country"];
        });

        this.cf.ee_dimension = this.cf.data.dimension(function(d){
            return d["about"]["address"]["city"];
        });

        // this.cf.gg_dimension = this.cf.data.dimension(function(d){
        //     return d.github;
        // });

        this.cf.ff_dimension = this.cf.data.dimension(function(d){
            return d["about"]["workLocation"]["company"];
        });

        // --  -- //
        // We need 2 identical dimensions for the numbers to update
        // See http://git.io/_IvVUw for details
        this.cf.aa_dimension = this.cf.data.dimension(function(d){
            return d["about"]["interest"];
        });

        // This is the dimension that we'll use for rendering
        this.cf.aar_dimension = this.cf.data.dimension(function(d){
            return d["about"]["interest"];
        });

        // Create empty filter roster
        this.activeFilters = {

            //"gg": [],
            "ee": [],
            "ff": [],
            "dd": [],
            "aa": [],
            "id": []
        };
    };


    this.renderTags = function(){

      var that = this;

      // Skills
      var aa_tags = this._aaReduce(this.cf.aar_dimension.groupAll().reduce(reduceAdd, reduceRemove, reduceInitial).value());
      var aa_list = d3.select("#table3").selectAll("li").data(aa_tags);
      aa_list.enter().append("li").html(function(d){
              var link = "<a href='#'>" + d.key;
              link += "<span class='badge'>" + d.value + "</span>";
              link += "</a>";
              return link;
          })
          .classed("active", function(d){
              return that._isActiveFilter("aa", d.key);
          })
          .on("click", function(d){
              that.filter("aa", d.key);
          });
      aa_list.exit().remove();

      // Country
      var dd_tags = this._removeEmptyKeys(this.cf.dd_dimension.group().all(), "dd");
      var dd_list = d3.select("#table1").selectAll("li").data(dd_tags);
      dd_list.enter().append("li").html(function(d){
              var link = "<a href='#'>" + d.key;
              link += "<span class='badge'>" + d.value + "</span>";
              link += "</a>";
              return link;
          })
          .classed("active", function(d){
              return that._isActiveFilter("dd", d.key);
          })
          .on("click", function(d){
              that.filter("dd", d.key);
          });
      dd_list.exit().remove();

      // City
      var ee_tags = this._removeEmptyKeys(this.cf.ee_dimension.group().all(), "ee");
      var ee_list = d3.select("#table6").selectAll("li").data(ee_tags);
      ee_list.enter().append("li").html(function(d){
              var link = "<a href='#'>" + d.key;
              link += "<span class='badge'>" + d.value + "</span>";
              link += "</a>";
              return link;
          })
          .classed("active", function(d){
              return that._isActiveFilter("ee", d.key);
          })
          .on("click", function(d){
              that.filter("ee", d.key);
          });
      ee_list.exit().remove();

      // organisation
      var ff_tags = this._removeEmptyKeys(this.cf.ff_dimension.group().all(), "ff");
      var ff_list = d3.select("#table2").selectAll("li").data(ff_tags);
      ff_list.enter().append("li").html(function(d){
              var link = "<a href='#'>" + d.key;
              link += "<span class='badge'>" + d.value + "</span>";
              link += "</a>";
              return link;
          })
          .classed("active", function(d){
              return that._isActiveFilter("ff", d.key);
          })
          .on("click", function(d){
              that.filter("ff", d.key);
          });
      ff_list.exit().remove();

      // GitHub
      /*var gg_tags = this._removeEmptyKeys(this.cf.gg_dimension.group().all(), "gg");
      var gg_list = d3.select("#table5").selectAll("li").data(gg_tags);
      gg_list.enter().append("li");
      gg_list
          .html(function(d){
              var link = "<a href='#'>" + d.key;
              link += "<span class='badge'>" + d.value + "</span>";
              link += "</a>";
              return link;
          })
          .classed("active", function(d){
              return that._isActiveFilter("gg", d.key);
          })
          .on("click", function(d){
              that.filter("gg", d.key);
          });
      gg_list.exit().remove();*/

      // Before rendering the Grid, we have to clear the layerGroup in the map instance in order to display new markers
      clearLayers();

      // Title aka Full Name
      id_tags = this._removeEmptyKeys(this.cf.id_dimension.group().all(), "id");
      var id_list = d3.select("#table4").selectAll("li").data(id_tags);
      id_list.enter().append("li").html(function(d){
            var article = that._findArticleById(d.key);
            var link = "<a href='#'>" + article["name"];
            link += "<span class='badge'>" + d.value + "</span>";
            link += "</a>";

            return link;
        })
        .classed("active", function(d){
            return that._isActiveFilter("id", d.key);
        })
        .on("click", function(d){
            that.filter("id", d.key);
        });
      id_list.exit().remove();

      // Grid at the bottom
      d3.select("#grid").selectAll("li").remove();
      var grid_list = d3.select("#grid").selectAll("li").data(id_tags);
      grid_list.enter().append("li").html(function(d,i){

          // Get full info
          var article = that._findArticleById(d.key);

          var lastOne = i==grid_list[0].length-1 ? true : false;

          // Call this line before codeAddressFromArticle to ensure that profile image url is already being fetched
          var cardHtml = that._renderArticleCardHtml(article);

          // Place a marker on the map as well for each of the elements in the grid, specify if it is the last one to update map bounds.
          codeAddressFromArticle(that,article,lastOne);

          // Return the HTML of the Card for this article
          return cardHtml;

        })
        .on("click", function(d){

            $(this).find(".panel").addClass("flip");

            var article = that._findArticleById(d.key);

            // Set the Html contents in the details div
            $('#details').html(that._renderArticlePopupHtml(article));

        })
        .on("mouseover", function(d){

            $(this).find(".panel").addClass("flip");

            var article = that._findArticleById(d.key);

            // Zoom map to element
            panMapToArticle(that,article);
        })
        /*.on("mouseout", function(d){

            $(this).find(".panel").removeClass("flip");

            // Fit bounds of map to make all markers visible
            mapFitBounds();
        })*/;

        grid_list.exit().remove();
    };

    this.filter = function(d, e){

      var that = this;

      var i = this.activeFilters[d].indexOf(e);
      if(i < 0){
          this.activeFilters[d].push(e);
      }else{
          this.activeFilters[d].splice(i, 1);
      }
      // RUN ALL THE FILTERS! :P

      this.cf.ee_dimension.filterAll();
      if(this.activeFilters["ee"].length > 0){
          this.cf.ee_dimension.filter(function(d){
              return that.activeFilters["ee"].indexOf(d) > -1;
          });
      }

      // this.cf.gg_dimension.filterAll();
      // if(this.activeFilters["gg"].length > 0){
      //     this.cf.gg_dimension.filter(function(d){
      //         return that.activeFilters["gg"].indexOf(d) > -1;
      //     });
      // }

      this.cf.dd_dimension.filterAll();
      if(this.activeFilters["dd"].length > 0){
          this.cf.dd_dimension.filter(function(d){
              return that.activeFilters["dd"].indexOf(d) > -1;
          });
      }

      this.cf.ff_dimension.filterAll();
      if(this.activeFilters["ff"].length > 0){
          this.cf.ff_dimension.filter(function(d){
              return that.activeFilters["ff"].indexOf(d) > -1;
          });
      }

      this.cf.id_dimension.filterAll();
      if(this.activeFilters["id"].length > 0){
          this.cf.id_dimension.filter(function(d){
              return that.activeFilters["id"].indexOf(d) > -1;
          });
      }

      this.cf.aa_dimension.filterAll();
      if(this.activeFilters["aa"].length > 0){
          this.cf.aa_dimension.filter(function(d){
              // d is the data of the dataset
              // f is the filters that are applied
              var f = that.activeFilters["aa"];

              var filter = true;
              for(var i in f){
                  if(d.indexOf(f[i]) < 0) filter = false;
              }

              return filter;
          });
      }

      this.renderTags();
    };

    // Defines method for search and typeahead.
    this.initSearch = function(){

      var that = this;

      var searchFilterArray = this._buildSearchFilterArray();

      $('#search').typeahead({

        source: function (query, process) {

          var articleTitles = searchFilterArray.articleTitles
          process(articleTitles);

        },
        updater: function (item) {

          var searchTerm = item;
          var article = searchFilterArray[searchTerm];
          if(article.filter){
              that.filter(article.filter,article["id"]);
          }

          return item;

        },
        matcher: function (item) {

          if (item.toLowerCase().indexOf(this.query.trim().toLowerCase()) != -1) {
            return true;
          }

        },
        sorter: function (items) {

          return items.sort();

        },
        highlighter: function (item) {

         var regex = new RegExp( '(' + this.query + ')', 'gi' );
         return item.replace( regex, "<strong>$1</strong>" );

        },

      });

      $('#clear_search_btn').click(function () {

        that.initCrossfilter();
        that.renderTags();
        $("#search").val("");

      });

    };

    // Defines method for search and typeahead.
    this.initMap = function(){

      initializeMap();

    }

    /*--------------------
      HELPERS
    --------------------*/

    // Generates the HTML content of the card representation of the articles on the grid
    this._renderArticleCardHtml = function(article){

      var container = $("<div/>").addClass("popup");
      var front = $("<div/>").addClass("front");
      var back  = $("<div/>").addClass("back");

      var thumbnail = $("<div/>").addClass("thumbnail thumbnail_holder_"+article["id"]);
      front.append(thumbnail);
      front.append("<br/>" + "<b>" + article["name"] + "</b>");
      article["image"] = this._getProfileImageUrl(article,thumbnail);

      var back_content = "";
      back_content += $("<div/>").addClass("organisation").html(article["workLocation"]["company"]).get(0).outerHTML;
      back_content += $("<div/>").addClass("city").html(article["address"]["city"] + ", " + article["address"]["country"]).get(0).outerHTML;

      //PGP
      // if (article.pgpkey && article.pgpurl){
      //  back_content += $("<div/>").addClass("pgp_key").html("PGP: " + '<a href="' + article.pgpurl + '" target="_self">' + article.pgpkey + "</a>").get(0).outerHTML;
      // }else if (article.pgpkey && !article.pgpurl){
      //  back_content += $("<div/>").addClass("pgp_key").html("PGP: " + article.pgpkey).get(0).outerHTML;
      // }

      // // EMAIL
      // if (article["contactPoint"]["city"]){
      //  back_content += $("<div/>").addClass("email").html('</br><a href="' + "mailto:" + article.email + '"><i class="fa fa-envelope fa-lg"></i></a>').get(0).outerHTML;
      // }

      // WEBSITE
      if (article["website"]){
        back_content += $("<div/>").addClass("website").html('<a href="' + article["website"] + '" target="_blank"><i class="fa fa-globe fa-lg"></i></a>').get(0).outerHTML;
      }

      // // TWITTER
      // if (article["contactPoint"]["twitter"]){
      //  back_content += $("<div/>").addClass("twitter").html('<a href="https://www.twitter.com/' + article["contactPoint"]["twitter"] + '" target="_blank"><i class="fa fa-twitter fa-lg"></i></a>').get(0).outerHTML;
      // }

      // // FACEBOOK
      // if (article.facebook){
      //  back_content += $("<div/>").addClass("twitter").html('<a href="' + article.facebook + '" target="_blank"><i class="fa fa-facebook fa-lg"></i></a>').get(0).outerHTML;
      // }

      // // LINKEDIN
      // if (article.linkedin){
      //  back_content += $("<div/>").addClass("twitter").html('<a href="' + article.linkedin + '" target="_blank"><i class="fa fa-linkedin fa-lg"></i></a>').get(0).outerHTML;
      // }

      // // GITHUB
      // if (article.github){
      //  back_content += $("<div/>").addClass("github").html('<a href="' + article.github + '" target="_blank"><i class="fa fa-github fa-lg"></i></a>').get(0).outerHTML;
      // }

      back.html(back_content);
      container.append(front);
      container.append(back);

      return container.get(0).outerHTML;

    }

    // Generates the HTML content of popups showed when clicking markers on the map
    this._renderArticlePopupHtml = function(article){

      var container = $("<div/>").addClass("popup");
      var front = $("<div/>").addClass("front");
      var back  = $("<div/>").addClass("back");


      var thumbnail = $("<div/>").addClass("thumbnail thumbnail_holder_"+article["id"]);
      front.append(thumbnail);
      front.append("<br/>" + "<b>" + article["name"] + "</b>");
      article["profileimg"] = this._getProfileImageUrl(article,thumbnail);

      var back_content = "";
      //back_content += $("<div/>").addClass("name").html(article["name"]]).get(0).outerHTML;
      back_content += $("<div/>").addClass("organisation").html(article["workLocation"]["company"]).get(0).outerHTML;
      back_content += $("<div/>").addClass("city").html(article["address"]["city"] + ", " + article["address"]["country"]).get(0).outerHTML;

      // //PGP
      // if (article.pgpkey && article.pgpurl){
      //  back_content += $("<div/>").addClass("pgp_key").html("PGP: " + '<a href="' + article.pgpurl + '" target="_self">' + article.pgpkey + "</a>").get(0).outerHTML;
      // }else if (article.pgpkey && !article.pgpurl){
      //  back_content += $("<div/>").addClass("pgp_key").html("PGP: " + article.pgpkey).get(0).outerHTML;
      // }

      // // EMAIL
      // if (article.email){
       // back_content += $("<div/>").addClass("email").html('</br><a href="' + "mailto:" + article.email + '"><i class="fa fa-envelope fa-lg"></i></a>').get(0).outerHTML;
      // }

      // WEBSITE
      if (article["website"]){
        back_content += $("<div/>").addClass("website").html('<a href="' + article["website"] + '" target="_blank"><i class="fa fa-globe fa-lg"></i></a>').get(0).outerHTML;
      }

      // TWITTER
      // if (article["contactPoint"]["twitter"]){
      //  back_content += $("<div/>").addClass("twitter").html('<a href="https://www.twitter.com/' + article["contactPoint"]["twitter"] + '" target="_blank"><i class="fa fa-twitter fa-lg"></i></a>').get(0).outerHTML;
      // }

      // // FACEBOOK
      // if (article.facebook){
      //  back_content += $("<div/>").addClass("twitter").html('<a href="' + article.facebook + '" target="_blank"><i class="fa fa-facebook fa-lg"></i></a>').get(0).outerHTML;
      // }

      // // LINKEDIN
      // if (article.linkedin){
      //  back_content += $("<div/>").addClass("twitter").html('<a href="' + article.linkedin + '" target="_blank"><i class="fa fa-linkedin fa-lg"></i></a>').get(0).outerHTML;
      // }

      // // GITHUB
      // if (article.github){
      //  back_content += $("<div/>").addClass("github").html('<a href="' + article.github + '" target="_blank"><i class="fa fa-github fa-lg"></i></a>').get(0).outerHTML;
      // }

      back.html(back_content);
      container.append(front);
      container.append(back);

      return container.get(0).outerHTML;

    }

    this._isActiveFilter = function(d,e){
        var i = this.activeFilters[d].indexOf(e);
        return i > -1;
    };

    // TODO Optimize this function, use Array.filter/reduce
    // Or create a hashmap of ids and their index in the array on init
    this._findArticleById = function(id){
        return articles[id]["about"];
    };

    // Gets the list of titles from the articles
    this._buildSearchFilterArray = function(){

      var that = this;

      //Define metadata Object, containing an array of titles for the autocompletion
      var articleSearchFilter = new Object;
      articleSearchFilter.articleTitles = [];

      // Skills
      var aa_tags = this._aaReduce(this.cf.aar_dimension.groupAll().reduce(reduceAdd, reduceRemove, reduceInitial).value());

      $.each(aa_tags, function( index, value ) {
        articleSearchFilter[value["key"]] = new Object;
        articleSearchFilter[value["key"]].filter = "aa";
        articleSearchFilter[value["key"]].id = value["key"];
        articleSearchFilter.articleTitles.push(value["key"]);
      });

      // Country
      var dd_tags = this._removeEmptyKeys(this.cf.dd_dimension.group().all(), "dd");

      $.each(dd_tags, function( index, value ) {
        articleSearchFilter[value["key"]] = new Object;
        articleSearchFilter[value["key"]].filter = "dd";
        articleSearchFilter[value["key"]].id = value["key"];
        articleSearchFilter.articleTitles.push(value["key"]);
      });

      // City
      var ee_tags = this._removeEmptyKeys(this.cf.ee_dimension.group().all(), "ee");

      $.each(ee_tags, function( index, value ) {
        articleSearchFilter[value["key"]] = new Object;
        articleSearchFilter[value["key"]].filter = "ee";
        articleSearchFilter[value["key"]].id = value["key"];
        articleSearchFilter.articleTitles.push(value["key"]);
      });

      // organisation
      var ff_tags = this._removeEmptyKeys(this.cf.ff_dimension.group().all(), "ff");

      $.each(ff_tags, function( index, value ) {
        articleSearchFilter[value["key"]] = new Object;
        articleSearchFilter[value["key"]].filter = "ff";
        articleSearchFilter[value["key"]].id = value["key"];
        articleSearchFilter.articleTitles.push(value["key"]);
      });

      // GitHub
      /*var gg_tags = this._removeEmptyKeys(this.cf.gg_dimension.group().all(), "gg");

      $.each(gg_tags, function( index, value ) {
        console.log(value["key"]);
        articleTitles.push(value["key"]);
      });*/

      // Title aka Full Name
      //id_tags = this._removeEmptyKeys(this.cf.id_dimension.group().all(), "id");

      $.each(id_tags, function( index, value ) {
        var a = that._findArticleById(value["key"]);
        articleSearchFilter[a.name] = new Object;
        articleSearchFilter[a.name].filter = "id";
        articleSearchFilter[a.name].id = a.id;
        articleSearchFilter.articleTitles.push(a.name);

      });

      return articleSearchFilter;

    };

    // This function does two things:
    //  1. Removes keys if their values are 0
    //  2. Removes all the keys but one if a filter is
    //     selected on ff, dd or id
    this._removeEmptyKeys = function(d, dim){
        if(dim === "aa"){
            var a = [];
            for(var i in d) if(d[i].value !== 0) a.push(d[i]);
            return a;
        }

        var f = this.activeFilters[dim];
        if(f.length === 0){
            var a = [];
            for(var i in d) if(d[i].value !== 0) a.push(d[i]);
            return a;
        }else{
            var a = [];
            for(var i  in d) if(f.indexOf(d[i].key) > -1) a.push(d[i]);
            return a;
        }
    };


    // The value we get for ... is in a different
    // format. This function makes it the same
    this._aaReduce = function(d){
        var a = [];
        for(var i in d) a.push({"key": i, "value": d[i]});
        return a;
    };

    // retrieves the profile image url of the user specified as parameter
    this._getProfileImageUrl = function(article,thumbnail_holder){

      // Check for image_url
      if(article["image"]){

        thumbnail_holder.html("<img src=\""+article["image"]+"\"></img>");

      }else if (!article["image"] && article["contactPoint"]["twitter"]){

        this._getTwitterProfileImageUrl(article);

      }else{

        article["image"] = 'res/img/noimage.png';
        thumbnail_holder.html("<img src=\""+article["image"]+"\"></img>");

      }

    }

    // Looks for the profile image url on twitter
    this._getTwitterProfileImageUrl = function(article){

      // Clean possible inconsistences in data input
      article["contactPoint"]["twitter"] = article["contactPoint"]["twitter"].replace( "@", "" );
      article["contactPoint"]["twitter"] = article["contactPoint"]["twitter"].replace( "http://www.twitter.com/", "" );
      article["contactPoint"]["twitter"] = article["contactPoint"]["twitter"].replace( "https://www.twitter.com/", "" );
      article["contactPoint"]["twitter"] = article["contactPoint"]["twitter"].replace( "https://twitter.com/", "" );
      article["contactPoint"]["twitter"] = article["contactPoint"]["twitter"].replace( "http://twitter.com/", "" );
      article["contactPoint"]["twitter"] = article["contactPoint"]["twitter"].replace( "twitter.com/", "" );

      $.get( "ext/twitter/twitter_profile_retriever.php?screen_name="+article["contactPoint"]["twitter"], function( data ) {
        data = data.replace("\n","");
        article["image"] = data;
        $(".thumbnail_holder_"+article["id"]).html("<img src=\""+article["image"]+"\"></img>");
      });

    };

    // retrieves the profile_url of the user specified as parameter
    this._getFacebookProfileUrl = function(username){

      console.log('_getTwitterProfileUrl');

    };

};


/*------------------------------
Reduce functions for the arrays
of AA.
------------------------------*/
function reduceAdd(p, v) {
  v["about"]["interest"].forEach (function(val, idx) {
     p[val] = (p[val] || 0) + 1; //increment counts
  });
  return p;
}

function reduceRemove(p, v) {
  v["about"]["interest"].forEach (function(val, idx) {
     p[val] = (p[val] || 0) - 1; //decrement counts
  });
  return p;

}

function reduceInitial() {
  return {};
}