document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var currentTab = tabs[0];
    var siteUrl = extractSiteUrl(currentTab.url);
    if (siteUrl) {
      var searchUrl = 'https://www.google.com/search?q=site:' + siteUrl;
      showLoadingIndicator();
      fetchLinksFromSearchResults(searchUrl);
      document.querySelector('.diggingSite').innerHTML = 'Site: '+siteUrl;

    }
    



  });
  var searchButton = document.getElementById('searchButton');
  var removeLinksCheckbox = document.getElementById('removeLinksCheckbox');

  document.getElementById("restartButton").addEventListener("click", function() {
    // Reload the current page
    location.reload();
    // Get the current tab
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  // Reload the tab
  chrome.tabs.reload(tabs[0].id);
});

  });

  searchButton.addEventListener('click', function() {
    clearCards();
    var websiteUrl = searchInput.value.trim();
    document.querySelector('.diggingSite').innerHTML = 'Site: '+websiteUrl;
    if (websiteUrl) {
      var searchUrl = 'https://www.google.com/search?q=site:' + websiteUrl;
      showLoadingIndicator();
      fetchLinksFromSearchResults(searchUrl);
    }
  });

  function fetchLinksFromSearchResults(url) {
 
  
    var links = [];
    fetchPageLinks(url, links);
  }

  function clearCards(){
    if (removeLinksCheckbox.checked) {
      linksContainer.innerHTML = '';
    } else {

    }

  }


  var copyButton = document.getElementById('copyButton');
  copyButton.addEventListener('click', function() {
    copyLinks();
  });

  function copyLinks() {
    var linksContainer = document.getElementById('linksContainer');
    var linkElements = linksContainer.getElementsByTagName('a');
    var links = [];
    for (var i = 0; i < linkElements.length; i++) {
      links.push(linkElements[i].href);
    }
    var linksText = links.join('\n');
    copyToClipboard(linksText);
    alert('Links copied to clipboard!\n\n\n\n'+linksText );
  }

  function copyToClipboard(text) {
    var dummyElement = document.createElement('textarea');
    dummyElement.value = text;
    document.body.appendChild(dummyElement);
    dummyElement.select();
    document.execCommand('copy');
    document.body.removeChild(dummyElement);
  }
















  
  var donateBtn = document.querySelector(".donateBtn")
  donateBtn.addEventListener('click', function() {
    console.log(12)

    chrome.tabs.create({ url: 'https://www.buymeacoffee.com/sohamk'});
  });

  function extractSiteUrl(url) {
    var match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im);
    return match ? match[1] : null;
  }

  function fetchLinksFromSearchResults(url) {
    var links = [];
    fetchPageLinks(url, links);
  }

  function fetchPageLinks(url, links) {
    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Too Many Requests');
          } else {
            throw new Error('Failed to fetch: ' + response.status + ' ' + response.statusText);
          }
        }
        return response.text();
      })
      .then(function(html) {
        var pageLinks = extractLinks(html);
        pageLinks.forEach(function(link) {
          var cleanLink = cleanUpLink(link);
          displayLink(cleanLink);
        });
        var nextPageUrl = getNextPageUrl(html);
        if (nextPageUrl) {
          fetchPageLinks(nextPageUrl, links);
        } else {
          hideLoadingIndicator();
        }
      })
      .catch(function(error) {
        hideLoadingIndicator();
        if (error.message === 'Too Many Requests') {
          document.getElementById('captchaBlock').style.display = 'block';
          // Display the webpage that caused the error in the iframe
          displayWebsite(url);
        } else {
          displayError('Failed to fetch: ' + error);
        }
      });
  }
  

  function extractLinks(html) {
    var links = [];
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var linkElements = doc.querySelectorAll('a');
    linkElements.forEach(function(linkElement) {
      var href = linkElement.href;
      if (isValidLink(href)) {
        var cleanLink = cleanUpLink(href);
        links.push(cleanLink);
        console.log('Clean Link: ' + cleanLink);
      }
    });
    return links;
  }

  function isValidLink(link) {
    return (
      link &&
      !link.startsWith('chrome-extension://') &&
      !link.startsWith('https://www.google.com/search') &&
      !link.startsWith('https://www.google.com/url?q=') &&
      !link.startsWith('#') &&
      !link.startsWith('policies.google.com') &&
      !link.startsWith('https://policies.google.com') &&
      !link.startsWith('https://support.google.com') &&
      !link.includes('google.com/policies')
    );
  }

  function cleanUpLink(link) {
    if (link.startsWith('https://')) {
      link = link.substring(8);
    } else if (link.startsWith('http://')) {
      link = link.substring(7);
    }
    if (link.endsWith('/')) {
      link = link.substring(0, link.length - 1);
    }
    return link;
  }

  function getNextPageUrl(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var nextPageElement = doc.querySelector('a[id="pnnext"]');
    if (nextPageElement) {
      return 'https://www.google.com' + nextPageElement.getAttribute('href');
    }
    return null;
  }

  function showLoadingIndicator() {
    document.getElementById('loading').style.display = 'block';
  }

  function hideLoadingIndicator() {
    document.getElementById('loading').style.display = 'none';
  }

  function displayLink(link) {
    document.getElementById('copyButton').style.display = "block";
    var linksContainer = document.getElementById('linksContainer');
    var card = document.createElement('div');
    card.classList.add('card');
    var linkElement = document.createElement('a');
    linkElement.href = 'https://' + link;
    linkElement.target = '_blank';
    linkElement.textContent = link;
    card.appendChild(linkElement);
    document.getElementById('loading').innerHTML = "More pages found! Loading more...";
    linksContainer.appendChild(card);
  }

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'displayLink') {
      // Update your UI to display the link
      console.log('Link:', request.link);
    } else if (request.action === 'displayError') {
      // Update your UI to display the error message
      displayError(request.error);
    } else if (request.action === 'displayWebsite') {
      // Display the website page in the iframe
      displayWebsite(request.url);
    }
  });

  function displayWebsite(url) {
    var iframe = document.getElementById('websiteIframe');
    iframe.src = url;
  }

  function displayError(error) {
    var errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = 'An error occurred: ' + error;
    errorContainer.style.display = 'block';
  }
});

