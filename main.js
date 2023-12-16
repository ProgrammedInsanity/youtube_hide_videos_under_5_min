// ==UserScript==
// @name         YouTube: Hide videos under 5 minutes.
// @license      MIT
// @description  Hides videos under 5 minutes.
// @author       Ev Haus
// @author       netjeff
// @author       actionless
// @author       ProgrammedInsanity aka the guy who added 10 lines of code to their code. 
// @match        http://*.youtube.com/*
// @match        http://youtube.com/*
// @match        https://*.youtube.com/*
// @match        https://youtube.com/*
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==





(function (_undefined) {
	// Enable for debugging
	const DEBUG = false;

    const logDebug = (...msgs) => {
		// eslint-disable-next-line no-console
		if (DEBUG) console.log('[YT-TOO-SHORT]', msgs);
	};


    	// GreaseMonkey no longer supports GM_addStyle. So we have to define
	// our own polyfill here
	const addStyle = function (aCss) {
		const head = document.getElementsByTagName('head')[0];
		if (head) {
			const style = document.createElement('style');
			style.setAttribute('type', 'text/css');
			style.textContent = aCss;
			head.appendChild(style);
			return style;
		}
		return null;
	};


    addStyle(`
    .YT-TOO-SHORT-HIDDEN { display: none !important }
    
    .YT-TOO-SHORT-DIMMED { opacity: 0.3 }

    .YT-TOO-SHORT-HIDDEN-ROW-PARENT { padding-bottom: 10px }    

    `);

    // ===========================================================

    const convertToSeconds = function (input) {
        const components = input.split(':');
        let hours = 0;
        let minutes = 0;
        let seconds = 0;
    
        // convert hour:minute:seconds text to int variables
        if (components.length === 3) {
            hours = parseInt(components[0]);
            minutes = parseInt(components[1]);
            seconds = parseInt(components[2]);
        } else if (components.length === 2) {
            minutes = parseInt(components[0]);
            seconds = parseInt(components[1]);
        } else if (components.length === 1) {
            seconds = parseInt(components[0]);
        }
    
        // Set NaN values to 0
        hours = isNaN(hours) ? 0 : hours;
        minutes = isNaN(minutes) ? 0 : minutes;
        seconds = isNaN(seconds) ? 0 : seconds;
    
        // Calculate the total seconds
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
        return totalSeconds;
    }
    
    // ===========================================================

    const findTimeElement = function () {
        const times = document.querySelectorAll(".ytd-thumbnail-overlay-time-status-renderer");
    
        var finalElements = [];
    
        for (const timeElement of times) {
            var timeContainerElement = timeElement.querySelector("#text");
    
            if (timeContainerElement && timeContainerElement.tagName.toLowerCase() === 'span') {
                const timeInSeconds = convertToSeconds(timeContainerElement.textContent);
    
                if (timeInSeconds < 300) {
                    if (!finalElements.includes(timeElement)) {
                        finalElements.push(timeElement);
                    }
                }
            }
        }
        return finalElements
    }

    // ===========================================================

    const determineYoutubeSection = function () {
		const {href} = window.location;

		let youtubeSection = 'misc';
		if (href.includes('/watch?')) {
			youtubeSection = 'watch';
		} else if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) {
			youtubeSection = 'channel';
		} else if (href.includes('/feed/subscriptions')) {
			youtubeSection = 'subscriptions';
		} else if (href.includes('/feed/trending')) {
			youtubeSection = 'trending';
		} else if (href.includes('/playlist?')) {
			youtubeSection = 'playlist';
		}
		return youtubeSection;
	};

    // ===========================================================
    const updateClassOnTooShortItems = function () {
		// Remove existing classes
		document.querySelectorAll('.YT-TOO-SHORT-DIMMED').forEach((el) => el.classList.remove('YT-TOO-SHORT-DIMMED'));
		document.querySelectorAll('.YT-TOO-SHORT-HIDDEN').forEach((el) => el.classList.remove('YT-TOO-SHORT-HIDDEN'));

		// If we're on the History page -- do nothing. We don't want to hide
		// watched videos here.
		if (window.location.href.indexOf('/feed/history') >= 0) return;

		const section = determineYoutubeSection();
		
		findTimeElement().forEach((item, _i) => {
			let tooShortItem;
			let dimmedItem;

			// "Subscription" section needs us to hide the "#contents",
			// but in the "Trending" section, that class will hide everything.
			// So there, we need to hide the "ytd-video-renderer"
			if (section === 'subscriptions') {
				// For rows, hide the row and the header too. We can't hide
				// their entire parent because then we'll get the infinite
				// page loader to load forever.
				tooShortItem = (
					// Grid item
					item.closest('.ytd-grid-renderer') ||
					item.closest('.ytd-item-section-renderer') ||
					item.closest('.ytd-rich-grid-row') ||
					// List item
					item.closest('#grid-container')
				);

				// If we're hiding the .ytd-item-section-renderer element, we need to give it
				// some extra spacing otherwise we'll get stuck in infinite page loading
				if (tooShortItem?.classList.contains('ytd-item-section-renderer')) {
					tooShortItem.closest('ytd-item-section-renderer').classList.add('YT-TOO-SHORT-HIDDEN-ROW-PARENT');
				}
			} else if (section === 'playlist') {
				tooShortItem = item.closest('ytd-playlist-video-renderer');
			} else if (section === 'watch') {
				tooShortItem = item.closest('ytd-compact-video-renderer');

				// Don't hide video if it's going to play next.
				//
				// If there is no tooShortItem - we probably got
				// `ytd-playlist-panel-video-renderer`:
				// let's also ignore it as in case of shuffle enabled
				// we could accidentially hide the item which gonna play next.
				if (
					tooShortItem?.closest('ytd-compact-autoplay-renderer')
				) {
					tooShortItem = null;
				}

				// For playlist items, we never hide them, but we will dim
				// them even if current mode is to hide rather than dim.
				const tooShortItemInPlaylist = item.closest('ytd-playlist-panel-video-renderer');
				if (!tooShortItem && tooShortItemInPlaylist) {
					dimmedItem = tooShortItemInPlaylist;
				}
			} else {
				// For home page and other areas
				tooShortItem = (
					item.closest('ytd-rich-item-renderer') ||
					item.closest('ytd-video-renderer') ||
					item.closest('ytd-grid-video-renderer')
				);
			}

			if (tooShortItem) {
				// Add hidden class
                
				tooShortItem.classList.add('YT-TOO-SHORT-HIDDEN');
				logDebug('Added YT-TOO-SHORT-HIDDEN to tooshortitem');
			}

				
		});

    };

    // ===========================================================
	const debounce = function (func, wait, immediate) {
		let timeout;
		return (...args) => {
			const later = () => {
				timeout = null;
				if (!immediate) func.apply(this, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(this, args);
		};
	};

    // ===========================================================

	const run = debounce((mutations) => {

		// don't react if only *OUR* own buttons changed state
		// to avoid running an endless loop

		if (mutations && mutations.length === 1) { return; }



		logDebug('Running check for too short videos');
		updateClassOnTooShortItems();
	}, 250);

	// ===========================================================

	// Hijack all XHR calls
	const send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function (data) {
		this.addEventListener('readystatechange', function () {
			if (
				// Anytime more videos are fetched -- re-run script
				this.responseURL.indexOf('browse_ajax?action_continuation') > 0
			) {
				setTimeout(() => {
					run();
				}, 0);
			}
		}, false);
		send.call(this, data);
	};

    // ========================================

    const observeDOM = (function () {
		const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		const eventListenerSupported = window.addEventListener;

		return function (obj, callback) {
			logDebug('Attaching DOM listener');

			// Invalid `obj` given
			if (!obj) return;

			if (MutationObserver) {
				const obs = new MutationObserver(((mutations, _observer) => {
					if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {

						callback(mutations);
					}
				}));

				obs.observe(obj, {childList: true, subtree: true});
			} else if (eventListenerSupported) {
				obj.addEventListener('DOMNodeInserted', callback, false);
				obj.addEventListener('DOMNodeRemoved', callback, false);
			}
		};
	}());



	logDebug('Starting Script');

	// YouTube does navigation via history and also does a bunch
	// of AJAX video loading. In order to ensure we're always up
	// to date, we have to listen for ANY DOM change event, and
	// re-run our script.
	observeDOM(document.body, run);

	run();
}());