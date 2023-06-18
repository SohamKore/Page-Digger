chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extractLinks') {
    var siteUrl = extractSiteUrl(request.url);
    if (siteUrl) {
      var searchUrl = 'https://www.google.com/search?q=site:' + siteUrl;
      fetchLinksFromSearchResults(searchUrl, function(links) {
        links.forEach(function(link) {
          // Send each link to the extension
          chrome.runtime.sendMessage({ action: 'displayLink', link: link });
        });
        sendResponse({ links: links });
      });
    }
  }
  return true;
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'displayLink') {
    // Update your UI to display the link
    console.log('Link:', request.link);
  }
});

function extractSiteUrl(url) {
  var match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im);
  return match ? match[1] : null;
}

function fetchLinksFromSearchResults(url, callback) {
  var links = [];
  fetchPageLinks(url, links, function() {
    callback(links);
  });
}

function fetchPageLinks(url, links, callback) {
  fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Failed to fetch: ' + response.status + ' ' + response.statusText);
      }
      return response.text();
    })
    .then(function(html) {
      var pageLinks = extractLinks(html);
      pageLinks.forEach(function(link) {
        // Send each link to the extension
        chrome.runtime.sendMessage({ action: 'displayLink', link: link });
      });
      links.push(...pageLinks);
      var nextPageUrl = getNextPageUrl(html);
      if (nextPageUrl) {
        fetchPageLinks(nextPageUrl, links, callback);
      } else {
        callback(links);
      }
    })
    .catch(function(error) {
      // Check if the error is due to a 429 status code (Too Many Requests)
      if (error.message.includes('Failed to fetch: 429')) {
        // Send the error message to the extension
        chrome.runtime.sendMessage({ action: 'displayError', error: error.message });
        callback([]);
      } else {
        throw error;
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
