'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// =============================================================================
/** Checks if x is strictly equal to any one of the following arguments. */
function isOneOf(x, ...values) {
    return values.includes(x);
}
/** Applies default keys to an object. */
function applyDefaults(obj, defaults) {
    for (let key of Object.keys(defaults)) {
        if (!obj.hasOwnProperty(key))
            obj[key] = defaults[key];
    }
    return obj;
}
const defaultMerge = ((a, b) => a.concat(b));
/** Deep extends obj1 with obj2, using a custom array merge function. */
function deepExtend(obj1, obj2, arrayMergeFn = defaultMerge) {
    for (const i of Object.keys(obj2)) {
        if (i in obj1 && Array.isArray(obj1[i]) && Array.isArray(obj2[i])) {
            obj1[i] = arrayMergeFn(obj1[i], obj2[i]);
        }
        else if (i in obj1 && obj1[i] instanceof Object &&
            obj2[i] instanceof Object) {
            deepExtend(obj1[i], obj2[i]);
        }
        else {
            obj1[i] = obj2[i];
        }
    }
}
/** Replacement for setTimeout() that is synchronous for time 0. */
function delay(fn, t = 0) {
    if (t) {
        return +setTimeout(fn, t);
    }
    else {
        fn();
        return 0;
    }
}
/** Creates a new promise together with functions to resolve or reject. */
function defer() {
    let resolve = (arg) => { };
    let reject = (arg) => { };
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    // This prevents exceptions when promises without .catch are rejected:
    promise.catch((error) => error);
    return { promise, resolve, reject };
}
/**
 * Function wrapper that prevents a function from being executed more than once
 * every t ms. This is particularly useful for optimising callbacks for
 * continues events like scroll, resize or slider move.
 *
 * @param {Function} fn
 * @param {?number} t
 * @returns {Function}
 */
function throttle(fn, t = 0) {
    let delay = false;
    let repeat = false;
    return function (...args) {
        if (delay) {
            repeat = true;
        }
        else {
            fn(...args);
            delay = true;
            setTimeout(function () {
                if (repeat)
                    fn(...args);
                delay = false;
                repeat = false;
            }, t);
        }
    };
}
/** Safe wrapper for JSON.parse. */
function safeToJSON(str, fallback = {}) {
    if (!str)
        return fallback;
    try {
        return JSON.parse(str) || fallback;
    }
    catch (e) {
        return fallback;
    }
}

// =============================================================================
// Core.ts | Array Functions
// (c) Mathigon
// =============================================================================
/** Creates an array of size `n`, containing `value` at every entry. */
function repeat(value, n) {
    return new Array(n).fill(value);
}
/** Returns the last item in an array, or the ith item from the end. */
function last(array, i = 0) {
    return array[array.length - 1 - i];
}
/** Finds the sum of all elements in an numeric array. */
function total(array) {
    return array.reduce((t, v) => t + v, 0);
}
/** Filters all duplicate elements from an array. */
function unique(array) {
    return array.filter((a, i) => array.indexOf(a) === i);
}

// =============================================================================
/** Splits a string into space separated words. */
function words(str, divider = /\s+/) {
    if (!str)
        return [];
    return str.trim().split(divider);
}
/** Converts a string to camel case. */
function toCamelCase(str) {
    return str.toLowerCase().replace(/^-/, '')
        .replace(/-(.)/g, (_, g) => g.toUpperCase());
}

// =============================================================================
/** Base class for event management. */
class EventTarget {
    constructor() {
        this.events = new Map();
    }
    /** Adds an event listener for one or more events. */
    on(events, fn) {
        for (let e of words(events)) {
            if (!this.events.has(e))
                this.events.set(e, []);
            this.events.get(e).push(fn);
        }
    }
    /** Adds a one-time event listener to one or more events. */
    one(events, fn) {
        const callback = (e) => {
            this.off(events, callback);
            fn(e);
        };
        this.on(events, callback);
    }
    /** Removes an event listener from one or more events. */
    off(events, fn) {
        for (let e of words(events)) {
            if (this.events.has(e)) {
                this.events.set(e, this.events.get(e).filter(x => x !== fn));
            }
        }
    }
    /** Triggers one or more events, and executes all bound event listeners. */
    trigger(events, arg) {
        for (let e of words(events)) {
            if (this.events.has(e)) {
                for (const callback of this.events.get(e)) {
                    callback(arg);
                }
            }
        }
    }
}

// =============================================================================
/** Converts a JSON object to an HTML query string. */
function toQueryString(data) {
    const pairs = [];
    for (let key of Object.keys(data)) {
        let value = data[key];
        key = encodeURIComponent(key);
        if (value == undefined) {
            pairs.push(key);
            continue;
        }
        value = Array.isArray(value) ? value.join(',') : '' + value;
        value = value.replace(/(\r)?\n/g, '\r\n');
        value = encodeURIComponent(value);
        value = value.replace(/%20/g, '+');
        pairs.push(key + '=' + value);
    }
    return pairs.join('&');
}
/** Converts an HTML query string to JSON object. */
function fromQueryString(str) {
    str = str.replace(/^[?,&]/, '');
    const pairs = decodeURIComponent(str).split('&');
    const result = {};
    pairs.forEach((pair) => {
        const x = pair.split('=');
        result[x[0]] = x[1];
    });
    return result;
}
// -----------------------------------------------------------------------------
// Request Utilities
/**
 * Asynchronously loads a resource using a POST request. This utility function
 * automatically form-encodes JSON data and adds a CSRF header.
 */
function post(url, data) {
    const options = {
        method: 'POST',
        body: !data ? undefined :
            (typeof data === 'string') ? data : toQueryString(data),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-Token': window.csrfToken || ''
        }
    };
    return fetch(url, options).then((r) => r.text());
}
/** Asynchronously loads and executes a JS script. */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.onerror = reject;
        el.onload = resolve;
        document.head.appendChild(el); // TODO Needs document!
    });
}
/** Asynchronously loads an Image. */
function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
    });
}
// -----------------------------------------------------------------------------
// Deferred Post
const POST_DATA = new Map();
function savePostData(url, data) {
    if (POST_DATA.has(url)) {
        deepExtend(POST_DATA.get(url), data, (a, b) => unique(a.concat(b)));
    }
    else {
        POST_DATA.set(url, data);
    }
}
function sendPostData() {
    if (!window.navigator.onLine)
        return;
    for (const [url, data] of POST_DATA) {
        // Remove the POST data immediately, but add it back if the request fails.
        // This means that deferredPost() can be called while an AJAX request is
        // in progress, and the data is not lost.
        POST_DATA.delete(url);
        post(url, { data: JSON.stringify(data) })
            .catch((error) => {
            console.error('Failed to send POST request:', error);
            savePostData(url, data);
        });
    }
}
const doDeferredPost = throttle(sendPostData, 5000);
window.addEventListener('online', doDeferredPost);
window.onbeforeunload = sendPostData;
/**
 * Utility function to throttle repeated POST requests. A request to the same
 * URL will be made at most every 5s, and the corresponding data objects will
 * be deep-merged.
 */
function deferredPost(url, data) {
    savePostData(url, data);
    doDeferredPost();
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

// ============================================================================
// Fermat.js | Utility Functions
// (c) Mathigon
// ============================================================================
const PRECISION = 0.000001;
// -----------------------------------------------------------------------------
// Checks and Comparisons
/** Checks if two numbers are nearly equals. */
function nearlyEquals(x, y, t = PRECISION) {
    if (isNaN(x) || isNaN(y))
        return false;
    return Math.abs(x - y) < t;
}
/** Checks if a number x is between two numbers a and b. */
function isBetween(x, a, b, t = PRECISION) {
    if (a > b)
        [a, b] = [b, a];
    return x > a + t && x < b - t;
}
/** Round a number `n` to the nearest multiple of `increment`. */
function roundTo(n, increment = 1) {
    return Math.round(n / increment) * increment;
}
// -----------------------------------------------------------------------------
// Simple Operations
/** Bounds a number between a lower and an upper limit. */
function clamp(x, min = -Infinity, max = Infinity) {
    return Math.min(max, Math.max(min, x));
}
/** Linear interpolation */
function lerp(a, b, t = 0.5) {
    return a + (b - a) * t;
}
/** Squares a number. */
function square(x) {
    return x * x;
}

// ============================================================================
/**
 * Returns an array of all possible subsets of an input array (of given length).
 */
function subsets(array, length = 0) {
    const copy = array.slice(0);
    const results = subsetsHelper(copy);
    return length ? results.filter(x => x.length === length) : results;
}
function subsetsHelper(array) {
    if (array.length === 1)
        return [[], array];
    const last = array.pop();
    const subsets = subsetsHelper(array);
    const result = [];
    for (const s of subsets) {
        result.push(s, [...s, last]);
    }
    return result;
}

// =============================================================================
// Core.ts | Utility Functions
// (c) Mathigon
// =============================================================================
/** Creates a random UID string of a given length. */
function uid(n = 10) {
    return Math.random().toString(36).substr(2, n);
}
/** Checks if x is strictly equal to any one of the following arguments. */
function isOneOf$1(x, ...values) {
    return values.includes(x);
}

// =============================================================================
// Core.ts | Array Functions
// (c) Mathigon
// =============================================================================
/** Creates an array of size `n`, containing `value` at every entry. */
function repeat$1(value, n) {
    return new Array(n).fill(value);
}
/** Creates a matrix of size `x` by `y`, containing `value` at every entry. */
function repeat2D(value, x, y) {
    const result = [];
    for (let i = 0; i < x; ++i) {
        result.push(repeat$1(value, y));
    }
    return result;
}
/**
 * Creates a matrix of size `x` by `y`, with the result of `fn(i, j)` at
 * position (i, j.
 */
function tabulate2D(fn, x, y) {
    const result = [];
    for (let i = 0; i < x; ++i) {
        const row = [];
        for (let j = 0; j < y; ++j) {
            row.push(fn(i, j));
        }
        result.push(row);
    }
    return result;
}
/** Creates an array of numbers from 0 to a, or from a to b. */
function list(a, b, step = 1) {
    const arr = [];
    if (b === undefined && a >= 0) {
        for (let i = 0; i < a; i += step)
            arr.push(i);
    }
    else if (b === undefined) {
        for (let i = 0; i > a; i -= step)
            arr.push(i);
    }
    else if (a <= b) {
        for (let i = a; i <= b; i += step)
            arr.push(i);
    }
    else {
        for (let i = a; i >= b; i -= step)
            arr.push(i);
    }
    return arr;
}
/** Finds the sum of all elements in an numeric array. */
function total$1(array) {
    return array.reduce((t, v) => t + v, 0);
}
/** Flattens a nested array into a single list. */
function flatten(array) {
    return array.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
}

// =============================================================================
// -----------------------------------------------------------------------------
// Points
/** A single point class defined by two coordinates x and y. */
class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.type = 'point';
    }
    get unitVector() {
        if (nearlyEquals(this.length, 0))
            return new Point(1, 0);
        return this.scale(1 / this.length);
    }
    get length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    get inverse() {
        return new Point(-this.x, -this.y);
    }
    get flip() {
        return new Point(this.y, this.x);
    }
    get perpendicular() {
        return new Point(-this.y, this.x);
    }
    get array() {
        return [this.x, this.y];
    }
    /** Finds the perpendicular distance between this point and a line. */
    distanceFromLine(l) {
        return Point.distance(this, l.project(this));
    }
    /** Clamps this point between given x and y values. */
    clamp(xMin, xMax, yMin, yMax) {
        return new Point(clamp(this.x, xMin, xMax), clamp(this.y, yMin, yMax));
    }
    /** Transforms this point using a 2x3 matrix m. */
    transform(m) {
        const x = m[0][0] * this.x + m[0][1] * this.y + m[0][2];
        const y = m[1][0] * this.x + m[1][1] * this.y + m[1][2];
        return new Point(x, y);
    }
    /** Rotates this point by a given angle (in radians) around c. */
    rotate(angle, c = ORIGIN) {
        const x0 = this.x - c.x;
        const y0 = this.y - c.y;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = x0 * cos - y0 * sin + c.x;
        const y = x0 * sin + y0 * cos + c.y;
        return new Point(x, y);
    }
    /** Reflects this point across a line l. */
    reflect(l) {
        let v = l.p2.x - l.p1.x;
        let w = l.p2.y - l.p1.y;
        let x0 = this.x - l.p1.x;
        let y0 = this.y - l.p1.y;
        let mu = (v * y0 - w * x0) / (v * v + w * w);
        let x = this.x + 2 * mu * w;
        let y = this.y - 2 * mu * v;
        return new Point(x, y);
    }
    scale(sx, sy = sx) {
        return new Point(this.x * sx, this.y * sy);
    }
    shift(x, y = x) {
        return new Point(this.x + x, this.y + y);
    }
    translate(p) {
        return this.shift(p.x, p.y); // Alias for .add()
    }
    changeCoordinates(originCoords, targetCoords) {
        const x = targetCoords.xMin + (this.x - originCoords.xMin) /
            (originCoords.dx) * (targetCoords.dx);
        const y = targetCoords.yMin + (this.y - originCoords.yMin) /
            (originCoords.dy) * (targetCoords.dy);
        return new Point(x, y);
    }
    add(p) {
        return Point.sum(this, p);
    }
    subtract(p) {
        return Point.difference(this, p);
    }
    equals(other) {
        return nearlyEquals(this.x, other.x) && nearlyEquals(this.y, other.y);
    }
    round(inc = 1) {
        return new Point(roundTo(this.x, inc), roundTo(this.y, inc));
    }
    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }
    mod(x, y = x) {
        return new Point(this.x % x, this.y % y);
    }
    angle(c = ORIGIN) {
        return rad(this, c);
    }
    /** Calculates the average of multiple points. */
    static average(...points) {
        let x = total$1(points.map(p => p.x)) / points.length;
        let y = total$1(points.map(p => p.y)) / points.length;
        return new Point(x, y);
    }
    /** Calculates the dot product of two points p1 and p2. */
    static dot(p1, p2) {
        return p1.x * p2.x + p1.y * p2.y;
    }
    static sum(p1, p2) {
        return new Point(p1.x + p2.x, p1.y + p2.y);
    }
    static difference(p1, p2) {
        return new Point(p1.x - p2.x, p1.y - p2.y);
    }
    /** Returns the Euclidean distance between two points p1 and p2. */
    static distance(p1, p2) {
        return Math.sqrt(square(p1.x - p2.x) + square(p1.y - p2.y));
    }
    /** Returns the Manhattan distance between two points p1 and p2. */
    static manhattan(p1, p2) {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
    }
    /** Interpolates two points p1 and p2 by a factor of t. */
    static interpolate(p1, p2, t = 0.5) {
        return new Point(lerp(p1.x, p2.x, t), lerp(p1.y, p2.y, t));
    }
    /** Interpolates a list of multiple points. */
    static interpolateList(points, t = 0.5) {
        const n = points.length - 1;
        const a = Math.floor(clamp(t, 0, 1) * n);
        return Point.interpolate(points[a], points[a + 1], n * t - a);
    }
    /** Creates a point from polar coordinates. */
    static fromPolar(angle, r = 1) {
        return new Point(r * Math.cos(angle), r * Math.sin(angle));
    }
}
const ORIGIN = new Point(0, 0);
// -----------------------------------------------------------------------------
// Angles
const TWO_PI = 2 * Math.PI;
function rad(p, c = ORIGIN) {
    const a = Math.atan2(p.y - c.y, p.x - c.x);
    return (a + TWO_PI) % TWO_PI;
}
// -----------------------------------------------------------------------------
// Lines, Rays and Line Segments
/** An infinite straight line that goes through two points. */
class Line {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.type = 'line';
    }
    make(p1, p2) {
        return new Line(p1, p2);
    }
    /* The distance between the two points defining this line. */
    get length() {
        return Point.distance(this.p1, this.p2);
    }
    /** The midpoint of this line. */
    get midpoint() {
        return Point.average(this.p1, this.p2);
    }
    /** The slope of this line. */
    get slope() {
        return (this.p2.y - this.p1.y) / (this.p2.x - this.p1.x);
    }
    /** The y-axis intercept of this line. */
    get intercept() {
        return this.p1.y + this.slope * this.p1.x;
    }
    /** The angle formed between this line and the x-axis. */
    get angle() {
        return rad(this.p2, this.p1);
    }
    /** The point representing a unit vector along this line. */
    get unitVector() {
        return this.p2.subtract(this.p1).unitVector;
    }
    /** The point representing the perpendicular vector of this line. */
    get perpendicularVector() {
        return new Point(this.p2.y - this.p1.y, this.p1.x - this.p2.x).unitVector;
    }
    /** Finds the line parallel to this one, going though point p. */
    parallel(p) {
        const q = Point.sum(p, Point.difference(this.p2, this.p1));
        return new Line(p, q);
    }
    /** Finds the line perpendicular to this one, going though point p. */
    perpendicular(p) {
        return new Line(p, Point.sum(p, this.perpendicularVector));
    }
    /** The perpendicular bisector of this line. */
    get perpendicularBisector() {
        return this.perpendicular(this.midpoint);
    }
    /** Projects this point onto the line `l`. */
    project(p) {
        const a = Point.difference(this.p2, this.p1);
        const b = Point.difference(p, this.p1);
        const proj = a.scale(Point.dot(a, b) / Math.pow(this.length, 2));
        return Point.sum(this.p1, proj);
    }
    /** Checks if a point p lies on this line. */
    contains(p) {
        // det([[p.x, p.y, 1],[p1.x, p1.y, 1],[p2.x, ,p2.y 1]])
        const det = p.x * (this.p1.y - this.p2.y) + this.p1.x * (this.p2.y - p.y)
            + this.p2.x * (p.y - this.p1.y);
        return nearlyEquals(det, 0);
    }
    at(t) {
        return Point.interpolate(this.p1, this.p2, t);
    }
    transform(m) {
        return new this.constructor(this.p1.transform(m), this.p2.transform(m));
    }
    rotate(a, c = ORIGIN) {
        return new this.constructor(this.p1.rotate(a, c), this.p2.rotate(a, c));
    }
    reflect(l) {
        return new this.constructor(this.p1.reflect(l), this.p2.reflect(l));
    }
    scale(sx, sy = sx) {
        return this.make(this.p1.scale(sx, sy), this.p2.scale(sx, sy));
    }
    shift(x, y = x) {
        return this.make(this.p1.shift(x, y), this.p2.shift(x, y));
    }
    translate(p) {
        return this.shift(p.x, p.y);
    }
    equals(other) {
        return this.contains(other.p1) && this.contains(other.p2);
    }
}
// -----------------------------------------------------------------------------
// Intersections
function liesOnSegment(s, p) {
    if (nearlyEquals(s.p1.x, s.p2.x))
        return isBetween(p.y, s.p1.y, s.p2.y);
    return isBetween(p.x, s.p1.x, s.p2.x);
}
function liesOnRay(r, p) {
    if (nearlyEquals(r.p1.x, r.p2.x))
        return (p.y - r.p1.y) / (r.p2.y - r.p1.y) >
            0;
    return (p.x - r.p1.x) / (r.p2.x - r.p1.x) > 0;
}
function lineLineIntersection(l1, l2) {
    const d1x = l1.p1.x - l1.p2.x;
    const d1y = l1.p1.y - l1.p2.y;
    const d2x = l2.p1.x - l2.p2.x;
    const d2y = l2.p1.y - l2.p2.y;
    const d = d1x * d2y - d1y * d2x;
    if (nearlyEquals(d, 0))
        return []; // Colinear lines never intersect
    const q1 = l1.p1.x * l1.p2.y - l1.p1.y * l1.p2.x;
    const q2 = l2.p1.x * l2.p2.y - l2.p1.y * l2.p2.x;
    const x = q1 * d2x - d1x * q2;
    const y = q1 * d2y - d1y * q2;
    return [new Point(x / d, y / d)];
}
function circleCircleIntersection(c1, c2) {
    const d = Point.distance(c1.c, c2.c);
    // Circles are separate:
    if (d > c1.r + c2.r)
        return [];
    // One circles contains the other:
    if (d < Math.abs(c1.r - c2.r))
        return [];
    // Circles are the same:
    if (nearlyEquals(d, 0) && nearlyEquals(c1.r, c2.r))
        return [];
    // Circles touch:
    if (nearlyEquals(d, c1.r + c2.r))
        return [new Line(c1.c, c2.c).midpoint];
    const a = (square(c1.r) - square(c2.r) + square(d)) / (2 * d);
    const b = Math.sqrt(square(c1.r) - square(a));
    const px = (c2.c.x - c1.c.x) * a / d + (c2.c.y - c1.c.y) * b / d + c1.c.x;
    const py = (c2.c.y - c1.c.y) * a / d - (c2.c.x - c1.c.x) * b / d + c1.c.y;
    const qx = (c2.c.x - c1.c.x) * a / d - (c2.c.y - c1.c.y) * b / d + c1.c.x;
    const qy = (c2.c.y - c1.c.y) * a / d + (c2.c.x - c1.c.x) * b / d + c1.c.y;
    return [new Point(px, py), new Point(qx, qy)];
}
// From http://mathworld.wolfram.com/Circle-LineIntersection.html
function lineCircleIntersection(l, c) {
    const dx = l.p2.x - l.p1.x;
    const dy = l.p2.y - l.p1.y;
    const dr2 = square(dx) + square(dy);
    const cx = c.c.x;
    const cy = c.c.y;
    const D = (l.p1.x - cx) * (l.p2.y - cy) - (l.p2.x - cx) * (l.p1.y - cy);
    const disc = square(c.r) * dr2 - square(D);
    if (disc < 0)
        return []; // No solution
    const xa = D * dy / dr2;
    const ya = -D * dx / dr2;
    if (nearlyEquals(disc, 0))
        return [c.c.shift(xa, ya)]; // One solution
    const xb = dx * (dy < 0 ? -1 : 1) * Math.sqrt(disc) / dr2;
    const yb = Math.abs(dy) * Math.sqrt(disc) / dr2;
    return [c.c.shift(xa + xb, ya + yb), c.c.shift(xa - xb, ya - yb)];
}
function isPolygonLike(shape) {
    return isOneOf$1(shape.type, 'polygon', 'polyline', 'rectangle');
}
function isLineLike(shape) {
    return isOneOf$1(shape.type, 'line', 'ray', 'segment');
}
function isCircle(shape) {
    return shape.type === 'circle';
}
/** Returns the intersection of two or more geometry objects. */
function intersections(...elements) {
    if (elements.length < 2)
        return [];
    if (elements.length > 2)
        return flatten(subsets(elements, 2).map(e => intersections(...e)));
    let [a, b] = elements;
    if (isPolygonLike(b))
        [a, b] = [b, a];
    if (isPolygonLike(a)) {
        // This hack is necessary to capture intersections between a line and a
        // vertex of a polygon. There are more edge cases to consider!
        const vertices = isLineLike(b) ?
            a.points.filter(p => b.contains(p)) : [];
        return [...vertices, ...intersections(b, ...a.edges)];
    }
    // TODO Handle arcs, sectors and angles!
    return simpleIntersection(a, b);
}
/** Finds the intersection of two lines or circles. */
function simpleIntersection(a, b) {
    let results = [];
    // TODO Handle Arcs and Rays
    if (isLineLike(a) && isLineLike(b)) {
        results = lineLineIntersection(a, b);
    }
    else if (isLineLike(a) && isCircle(b)) {
        results = lineCircleIntersection(a, b);
    }
    else if (isCircle(a) && isLineLike(b)) {
        results = lineCircleIntersection(b, a);
    }
    else if (isCircle(a) && isCircle(b)) {
        results = circleCircleIntersection(a, b);
    }
    for (const x of [a, b]) {
        if (x.type === 'segment')
            results =
                results.filter(i => liesOnSegment(x, i));
        if (x.type === 'ray')
            results = results.filter(i => liesOnRay(x, i));
    }
    return results;
}

// =============================================================================
var Matrix;
(function (Matrix) {
    // ---------------------------------------------------------------------------
    // Constructors
    /** Fills a matrix of size x, y with a given value. */
    function fill(value, x, y) {
        return repeat2D(value, x, y);
    }
    Matrix.fill = fill;
    /** Returns the identity matrix of size n. */
    function identity(n = 2) {
        const x = fill(0, n, n);
        for (let i = 0; i < n; ++i)
            x[i][i] = 1;
        return x;
    }
    Matrix.identity = identity;
    function rotation(angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        return [[cos, -sin], [sin, cos]];
    }
    Matrix.rotation = rotation;
    function shear(lambda) {
        return [[1, lambda], [0, 1]];
    }
    Matrix.shear = shear;
    function reflection(angle) {
        const sin = Math.sin(2 * angle);
        const cos = Math.cos(2 * angle);
        return [[cos, sin], [sin, -cos]];
    }
    Matrix.reflection = reflection;
    // ---------------------------------------------------------------------------
    // Matrix Operations
    /** Calculates the sum of two or more matrices. */
    function sum(...matrices) {
        const [M1, ...rest] = matrices;
        const M2 = rest.length > 1 ? sum(...rest) : rest[0];
        if (M1.length !== M2.length || M1[0].length !== M2[0].length)
            throw new Error('Matrix sizes don’t match');
        const S = [];
        for (let i = 0; i < M1.length; ++i) {
            const row = [];
            for (let j = 0; j < M1[i].length; ++j) {
                row.push(M1[i][j] + M2[i][j]);
            }
            S.push(row);
        }
        return S;
    }
    Matrix.sum = sum;
    /** Multiplies a matrix M by a scalar v. */
    function scalarProduct(M, v) {
        return M.map(row => row.map((x, i) => x * v));
    }
    Matrix.scalarProduct = scalarProduct;
    /** Calculates the matrix product of multiple matrices. */
    function product(...matrices) {
        let [M1, ...rest] = matrices;
        let M2 = rest.length > 1 ? product(...rest) : rest[0];
        if (M1[0].length !== M2.length)
            throw new Error('Matrix sizes don’t match.');
        let P = [];
        for (let i = 0; i < M1.length; ++i) {
            let row = [];
            for (let j = 0; j < M2[0].length; ++j) {
                let value = 0;
                for (let k = 0; k < M2.length; ++k) {
                    value += M1[i][k] * M2[k][j];
                }
                row.push(value);
            }
            P.push(row);
        }
        return P;
    }
    Matrix.product = product;
    // ---------------------------------------------------------------------------
    // Matrix Properties
    /** Calculates the transpose of a matrix M. */
    function transpose(M) {
        let T = [];
        for (let j = 0; j < M[0].length; ++j) {
            let row = [];
            for (let i = 0; i < M.length; ++i) {
                row.push(M[i][j]);
            }
            T.push(row);
        }
        return T;
    }
    Matrix.transpose = transpose;
    /** Calculates the determinant of a matrix M. */
    function determinant(M) {
        if (M.length !== M[0].length)
            throw new Error('Not a square matrix.');
        let n = M.length;
        // Shortcuts for small n
        if (n === 1)
            return M[0][0];
        if (n === 2)
            return M[0][0] * M[1][1] - M[0][1] * M[1][0];
        let det = 0;
        for (let j = 0; j < n; ++j) {
            let diagLeft = M[0][j];
            let diagRight = M[0][j];
            for (let i = 1; i < n; ++i) {
                diagRight *= M[i][j + i % n];
                diagLeft *= M[i][j - i % n];
            }
            det += diagRight - diagLeft;
        }
        return det;
    }
    Matrix.determinant = determinant;
    /** Calculates the inverse of a matrix M. */
    function inverse(M) {
        // Perform Gaussian elimination:
        // (1) Apply the same operations to both I and C.
        // (2) Turn C into the identity, thereby turning I into the inverse of C.
        let n = M.length;
        if (n !== M[0].length)
            throw new Error('Not a square matrix.');
        let I = identity(n);
        let C = tabulate2D((x, y) => M[x][y], n, n); // Copy of original matrix
        for (let i = 0; i < n; ++i) {
            // Loop over the elements e in along the diagonal of C.
            let e = C[i][i];
            // If e is 0, we need to swap this row with a lower row.
            if (!e) {
                for (let ii = i + 1; ii < n; ++ii) {
                    if (C[ii][i] !== 0) {
                        for (let j = 0; j < n; ++j) {
                            [C[ii][j], C[i][j]] = [C[i][j], C[ii][j]];
                            [I[ii][j], I[i][j]] = [I[i][j], I[ii][j]];
                        }
                        break;
                    }
                }
                e = C[i][i];
                if (!e)
                    throw new Error('Matrix not invertible.');
            }
            // Scale row by e, so that we have a 1 on the diagonal.
            for (let j = 0; j < n; ++j) {
                C[i][j] = C[i][j] / e;
                I[i][j] = I[i][j] / e;
            }
            // Subtract a multiple of this row from all other rows,
            // so that they end up having 0s in this column.
            for (let ii = 0; ii < n; ++ii) {
                if (ii === i)
                    continue;
                let f = C[ii][i];
                for (let j = 0; j < n; ++j) {
                    C[ii][j] -= f * C[i][j];
                    I[ii][j] -= f * I[i][j];
                }
            }
        }
        return I;
    }
    Matrix.inverse = inverse;
})(Matrix || (Matrix = {}));

// ============================================================================
var Random;
(function (Random) {
    /** Randomly shuffles the elements in an array a. */
    function shuffle(a) {
        a = a.slice(0); // create copy
        for (let i = a.length - 1; i > 0; --i) {
            let j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    Random.shuffle = shuffle;
    /** Generates a random integer between 0 and a, or between a and b. */
    function integer(a, b) {
        let start = (b === undefined ? 0 : a);
        let length = (b === undefined ? a : b - a + 1);
        return start + Math.floor(length * Math.random());
    }
    Random.integer = integer;
    /** Chooses a random index value from weights [2, 5, 3] */
    function weighted(weights) {
        const x = Math.random() * total$1(weights);
        let cum = 0;
        return weights.findIndex((w) => (cum += w) >= x);
    }
    Random.weighted = weighted;
    // ---------------------------------------------------------------------------
    // Smart Random Number Generators
    const SMART_RANDOM_CACHE = new Map();
    /**
     * Returns a random number between 0 and n, but avoids returning the same
     * number multiple times in a row.
     */
    function smart(n, id) {
        if (!id)
            id = uid();
        if (!SMART_RANDOM_CACHE.has(id))
            SMART_RANDOM_CACHE.set(id, repeat$1(1, n));
        const cache = SMART_RANDOM_CACHE.get(id);
        const x = weighted(cache.map(x => x * x));
        cache[x] -= 1;
        if (cache[x] <= 0)
            SMART_RANDOM_CACHE.set(id, cache.map(x => x + 1));
        return x;
    }
    Random.smart = smart;
    // ---------------------------------------------------------------------------
    // Probability Distribution
    /** Generates a Bernoulli random variable. */
    function bernoulli(p = 0.5) {
        return (Math.random() < p ? 1 : 0);
    }
    Random.bernoulli = bernoulli;
    /** Generates a Binomial random variable. */
    function binomial(n = 1, p = 0.5) {
        let t = 0;
        for (let i = 0; i < n; ++i)
            t += bernoulli(p);
        return t;
    }
    Random.binomial = binomial;
    /** Generates a Poisson random variable. */
    function poisson(l = 1) {
        if (l <= 0)
            return 0;
        const L = Math.exp(-l);
        let p = 1;
        let k = 0;
        for (; p > L; ++k)
            p *= Math.random();
        return k - 1;
    }
    Random.poisson = poisson;
    /** Generates a uniform random variable. */
    function uniform(a = 0, b = 1) {
        return a + (b - a) * Math.random();
    }
    Random.uniform = uniform;
    /** Generates a normal random variable with mean m and variance v. */
    function normal(m = 0, v = 1) {
        const u1 = Math.random();
        const u2 = Math.random();
        const rand = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return rand * Math.sqrt(v) + m;
    }
    Random.normal = normal;
    /** Generates an exponential random variable. */
    function exponential(l = 1) {
        return l <= 0 ? 0 : -Math.log(Math.random()) / l;
    }
    Random.exponential = exponential;
    /** Generates a geometric random variable. */
    function geometric(p = 0.5) {
        if (p <= 0 || p > 1)
            return undefined;
        return Math.floor(Math.log(Math.random()) / Math.log(1 - p));
    }
    Random.geometric = geometric;
    /** Generates an Cauchy random variable. */
    function cauchy() {
        let rr, v1, v2;
        do {
            v1 = 2 * Math.random() - 1;
            v2 = 2 * Math.random() - 1;
            rr = v1 * v1 + v2 * v2;
        } while (rr >= 1);
        return v1 / v2;
    }
    Random.cauchy = cauchy;
    // ---------------------------------------------------------------------------
    // PDFs and CDFs
    /** Generates pdf(x) for the normal distribution with mean m and variance v. */
    function normalPDF(x, m = 1, v = 0) {
        return Math.exp(-(Math.pow((x - m), 2)) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
    }
    Random.normalPDF = normalPDF;
    const G = 7;
    const P = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];
    function gamma(z) {
        if (z < 0.5)
            return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
        z -= 1;
        let x = P[0];
        for (let i = 1; i < G + 2; i++)
            x += P[i] / (z + i);
        let t = z + G + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
    /** Riemann-integrates fn(x) from xMin to xMax with an interval size dx. */
    function integrate(fn, xMin, xMax, dx = 1) {
        let result = 0;
        for (let x = xMin; x < xMax; x += dx) {
            result += (fn(x) * dx || 0);
        }
        return result;
    }
    Random.integrate = integrate;
    /** The chi CDF function. */
    function chiCDF(chi, deg) {
        let int = integrate(t => Math.pow(t, (deg - 2) / 2) * Math.exp(-t / 2), 0, chi);
        return 1 - int / Math.pow(2, deg / 2) / gamma(deg / 2);
    }
    Random.chiCDF = chiCDF;
})(Random || (Random = {}));

// =============================================================================
var Regression;
(function (Regression) {
    /**
     * Finds a linear regression that best approximates a set of data. The result
     * will be an array [c, m], where y = m * x + c.
     */
    function linear(data, throughOrigin = false) {
        let sX = 0, sY = 0, sXX = 0, sXY = 0;
        const len = data.length;
        for (let n = 0; n < len; n++) {
            sX += data[n][0];
            sY += data[n][1];
            sXX += data[n][0] * data[n][0];
            sXY += data[n][0] * data[n][1];
        }
        if (throughOrigin) {
            const gradient = sXY / sXX;
            return [0, gradient];
        }
        const gradient = (len * sXY - sX * sY) / (len * sXX - sX * sX);
        const intercept = (sY / len) - (gradient * sX) / len;
        return [intercept, gradient];
    }
    Regression.linear = linear;
    /**
     * Finds an exponential regression that best approximates a set of data. The
     * result will be an array [a, b], where y = a * e^(bx).
     */
    function exponential(data) {
        const sum = [0, 0, 0, 0, 0, 0];
        for (const d of data) {
            sum[0] += d[0];
            sum[1] += d[1];
            sum[2] += d[0] * d[0] * d[1];
            sum[3] += d[1] * Math.log(d[1]);
            sum[4] += d[0] * d[1] * Math.log(d[1]);
            sum[5] += d[0] * d[1];
        }
        const denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
        const a = Math.exp((sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
        const b = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;
        return [a, b];
    }
    Regression.exponential = exponential;
    /**
     * Finds a logarithmic regression that best approximates a set of data. The
     * result will be an array [a, b], where y = a + b * log(x).
     */
    function logarithmic(data) {
        const sum = [0, 0, 0, 0];
        const len = data.length;
        for (const d of data) {
            sum[0] += Math.log(d[0]);
            sum[1] += d[1] * Math.log(d[0]);
            sum[2] += d[1];
            sum[3] += Math.pow(Math.log(d[0]), 2);
        }
        const b = (len * sum[1] - sum[2] * sum[0]) /
            (len * sum[3] - sum[0] * sum[0]);
        const a = (sum[2] - b * sum[0]) / len;
        return [a, b];
    }
    Regression.logarithmic = logarithmic;
    /**
     * Finds a power regression that best approximates a set of data. The result
     * will be an array [a, b], where y = a * x^b.
     */
    function power(data) {
        const sum = [0, 0, 0, 0];
        const len = data.length;
        for (const d of data) {
            sum[0] += Math.log(d[0]);
            sum[1] += Math.log(d[1]) * Math.log(d[0]);
            sum[2] += Math.log(d[1]);
            sum[3] += Math.pow(Math.log(d[0]), 2);
        }
        const b = (len * sum[1] - sum[2] * sum[0]) /
            (len * sum[3] - sum[0] * sum[0]);
        const a = Math.exp((sum[2] - b * sum[0]) / len);
        return [a, b];
    }
    Regression.power = power;
    /**
     * Finds a polynomial regression of given `order` that best approximates a set
     * of data. The result will be an array giving the coefficients of the
     * resulting polynomial.
     */
    function polynomial(data, order = 2) {
        // X = [[1, x1, x1^2], [1, x2, x2^2], [1, x3, x3^2]
        // y = [y1, y2, y3]
        let X = data.map(d => list(order + 1).map(p => Math.pow(d[0], p)));
        let XT = Matrix.transpose(X);
        let y = data.map(d => [d[1]]);
        let XTX = Matrix.product(XT, X); // XT*X
        let inv = Matrix.inverse(XTX); // (XT*X)^(-1)
        let r = Matrix.product(inv, XT, y); // (XT*X)^(-1) * XT * y
        return r.map(x => x[0]); // Flatten matrix
    }
    Regression.polynomial = polynomial;
    // ---------------------------------------------------------------------------
    // Regression Coefficient
    /**
     * Finds the regression coefficient of a given data set and regression
     * function.
     */
    function coefficient(data, fn) {
        let total = data.reduce((sum, d) => sum + d[1], 0);
        let mean = total / data.length;
        // Sum of squares of differences from the mean in the dependent variable
        let ssyy = data.reduce((sum, d) => sum + Math.pow((d[1] - mean), 2), 0);
        // Sum of squares of residuals
        let sse = data.reduce((sum, d) => sum + Math.pow((d[1] - fn(d[0])), 2), 0);
        return 1 - (sse / ssyy);
    }
    Regression.coefficient = coefficient;
    const types = [{
            name: 'linear',
            regression: linear,
            fn: (p, x) => p[0] + x * p[1]
        }, {
            name: 'quadratic',
            regression: polynomial,
            fn: (p, x) => p[0] + x * p[1] + x * x * p[2]
        }, {
            name: 'cubic',
            regression: (data) => polynomial(data, 3),
            fn: (p, x) => p[0] + x * p[1] + x * x * p[2] + x * x * x *
                p[3]
        }, {
            name: 'exponential',
            regression: exponential,
            fn: (p, x) => p[0] * Math.pow(Math.E, p[1] * x)
        }];
    /** Finds the most suitable regression for a given dataset. */
    function find(data, threshold = 0.9) {
        if (data.length > 1) {
            for (const t of types) {
                const params = t.regression(data);
                const fn = t.fn.bind(undefined, params);
                const coeff = coefficient(data, fn);
                if (coeff > threshold)
                    return { type: t.name, fn, params, coeff };
            }
        }
        return { type: undefined, fn: () => { }, params: [], coeff: undefined };
    }
    Regression.find = find;
})(Regression || (Regression = {}));

// =============================================================================
const touchSupport = ('ontouchstart' in window);
const pointerSupport = ('onpointerdown' in window);
/** Gets the pointer position from an event. */
function pointerPosition(e) {
    if (e.touches) {
        const touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
        return new Point(touches[0].clientX, touches[0].clientY);
    }
    else {
        return new Point(e.clientX, e.clientY);
    }
}
function getTouches(e) {
    return e.touches || [];
}
/**
 * Gets the pointer position from an event triggered on an `<svg>` element, in
 * the coordinate system of the `<svg>` element.
 */
function svgPointerPosn(event, $svg) {
    const posn = pointerPosition(event);
    return posn.transform($svg.inverseTransformMatrix);
}
/**
 * Gets the pointer position from an event triggered on an `<canvas>` element,
 * in the coordinate system of the `<canvas>` element.
 */
function canvasPointerPosition(event, $canvas) {
    const posn = pointerPosition(event);
    const bounds = $canvas.bounds;
    const x = (posn.x - bounds.left) * $canvas.canvasWidth / bounds.width;
    const y = (posn.y - bounds.top) * $canvas.canvasHeight / bounds.height;
    return new Point(x, y);
}
/**
 * Get the target element for an event, including for touch/pointer events
 * that started on a different element.
 */
function getEventTarget(event) {
    if (event instanceof PointerEvent && event.pointerType === 'mouse') {
        // Only pointer mouse events update the target for move events that started
        // on a different element.
        return $(event.target);
    }
    const posn = pointerPosition(event);
    return $(document.elementFromPoint(posn.x, posn.y) || undefined);
}
// -----------------------------------------------------------------------------
// Click Events
function makeTapEvent($el) {
    // TODO Support removing events.
    if ($el._data['tapEvent'])
        return;
    $el._data['tapEvent'] = true;
    let start = undefined;
    $el.on('pointerdown', (e) => start = pointerPosition(e));
    $el.on('pointerup', (e) => {
        if (!start)
            return;
        const end = pointerPosition(e);
        if (Point.distance(start, end) < 6)
            $el.trigger('tap', e);
        start = undefined;
    });
    $el.on('pointercancel', () => start = undefined);
}
function makeClickOutsideEvent($el) {
    // TODO Support removing events.
    if ($el._data['clickOutsideEvent'])
        return;
    $el._data['clickOutsideEvent'] = true;
    $body.on('pointerdown', (e) => {
        const $target = $(e.target);
        if ($target && ($target.equals($el) || $target.hasParent($el)))
            return;
        $el.trigger('clickOutside', e);
    });
}
function slide($el, fns) {
    let isAnimating = false;
    let posn = pointerPosition;
    if ($el.type === 'svg') {
        posn = (e) => svgPointerPosn(e, $el.$ownerSVG);
    }
    else if ($el.type === 'canvas') {
        posn = (e) => canvasPointerPosition(e, $el);
    }
    const $parent = fns.justInside ? $el : $body;
    let startPosn = undefined;
    let lastPosn = undefined;
    if ($el.css('touch-action') === 'auto')
        $el.css('touch-action', 'none');
    function start(e) {
        e.preventDefault();
        if (e.handled || getTouches(e).length > 1)
            return;
        e.handled = true;
        if ('move' in fns)
            $parent.on('pointermove', move);
        $parent.on('pointerstop', end);
        startPosn = lastPosn = posn(e);
        if (fns.start)
            fns.start(startPosn);
    }
    function move(e) {
        e.preventDefault();
        if (isAnimating)
            return;
        isAnimating = true;
        window.requestAnimationFrame(function () {
            if (!isAnimating)
                return;
            const p = posn(e);
            if (fns.move)
                fns.move(p, startPosn, lastPosn);
            lastPosn = p;
            isAnimating = false;
        });
    }
    function end(e) {
        e.preventDefault();
        if (getTouches(e).length > 0)
            return;
        isAnimating = false;
        if (fns.move)
            $parent.off('pointermove', move);
        $parent.off('pointerstop', end);
        if (fns.end)
            fns.end(lastPosn, startPosn);
    }
    $el.on('pointerdown', start);
    if (fns.justInside)
        $el.on('mouseleave', end);
}
// -----------------------------------------------------------------------------
// Scroll Events
function makeScrollEvents($el) {
    // TODO Support removing events.
    if ($el._data['scrollEvents'])
        return;
    $el._data['scrollEvents'] = true;
    let ticking = false;
    let top = undefined;
    function tick() {
        const newTop = $el.scrollTop;
        if (newTop === top) {
            ticking = false;
            return;
        }
        top = newTop;
        $el.trigger('scroll', { top });
        // TODO Scroll should trigger mousemove events.
        window.requestAnimationFrame(tick);
    }
    function scroll() {
        if (!ticking)
            window.requestAnimationFrame(tick);
        ticking = true;
    }
    // Mouse Events
    const target = $el.type === 'window' ? window : $el._el;
    target.addEventListener('scroll', scroll);
    // Touch Events
    function touchStart() {
        window.addEventListener('touchmove', scroll);
        window.addEventListener('touchend', touchEnd);
    }
    function touchEnd() {
        window.removeEventListener('touchmove', scroll);
        window.removeEventListener('touchend', touchEnd);
    }
    $el._el.addEventListener('touchstart', function (e) {
        if (!e.handled)
            touchStart();
    });
}
function hover($el, options) {
    let timeout = 0;
    let active = false;
    let wasTriggeredByMouse = false;
    $el.on('mouseover', () => {
        if (options.preventMouseover && options.preventMouseover())
            return;
        clearTimeout(timeout);
        timeout = delay(() => {
            if (active)
                return;
            if (options.enter)
                options.enter();
            wasTriggeredByMouse = true;
            active = true;
        }, options.delay);
    });
    $el.on('mouseout', () => {
        if (!wasTriggeredByMouse)
            return;
        clearTimeout(timeout);
        timeout = delay(() => {
            if (!active)
                return;
            if (options.exit)
                options.exit();
            active = false;
        }, options.exitDelay || options.delay);
    });
    const $clickTarget = options.$clickTarget || $el;
    $clickTarget.on('click', () => {
        if (active && (!wasTriggeredByMouse)) {
            if (options.exit)
                options.exit();
            active = false;
        }
        else if (!active) {
            if (options.enter)
                options.enter();
            wasTriggeredByMouse = false;
            active = true;
        }
    });
    $el.on('clickOutside', () => {
        if (!active)
            return;
        if (options.exit)
            options.exit();
        active = false;
    });
}
// -----------------------------------------------------------------------------
// Intersection Events
let observer;
function intersectionCallback(entries) {
    for (const e of entries) {
        const event = e.isIntersecting ? 'enterViewport' : 'exitViewport';
        setTimeout(() => $(e.target).trigger(event));
    }
}
function makeIntersectionEvents($el) {
    // TODO Support removing events.
    if ($el._data['intersectionEvents'])
        return;
    $el._data['intersectionEvents'] = true;
    // Polyfill for window.IntersectionObserver
    if (!window.IntersectionObserver) {
        let wasVisible = false;
        $body.on('scroll', () => {
            const isVisible = $el.isInViewport;
            if (wasVisible && !isVisible) {
                $el.trigger('exitViewport');
                wasVisible = false;
            }
            else if (isVisible && !wasVisible) {
                $el.trigger('enterViewport');
                wasVisible = true;
            }
        });
        return;
    }
    if (!observer)
        observer = new IntersectionObserver(intersectionCallback);
    observer.observe($el._el);
}
// -----------------------------------------------------------------------------
// Resize Events
function makeResizeEvents($el, remove = false) {
    if (remove) {
        if ($el._data['resizeObserver'])
            $el._data['resizeObserver'].disconnect();
        $el._data['resizeObserver'] = undefined;
    }
    if ($el._data['resizeObserver'])
        return;
    if (window.ResizeObserver) {
        const observer = new window.ResizeObserver(() => $el.trigger('resize'));
        observer.observe($el._el);
        $el._data['resizeObserver'] = observer;
    }
    else if (window.MutationObserver) {
        const observer = new MutationObserver(() => $el.trigger('resize'));
        observer.observe($el._el, { attributes: true, childList: true, characterData: true, subtree: true });
        $el._data['resizeObserver'] = observer;
    }
}
// -----------------------------------------------------------------------------
// Pointer Events
function makePointerPositionEvents($el) {
    // TODO Support removing events.
    if ($el._data['pointerPositionEvents'])
        return;
    $el._data['pointerPositionEvents'] = true;
    const parent = $el.parent;
    let isInside = undefined;
    parent.on('pointerend', () => isInside = undefined);
    parent.on('pointermove', (e) => {
        const wasInside = isInside;
        const target = getEventTarget(e);
        isInside = target.equals($el) || target.hasParent($el);
        if (wasInside != undefined && isInside && !wasInside)
            $el.trigger('pointerenter', e);
        if (!isInside && wasInside)
            $el.trigger('pointerleave', e);
    });
}
// -----------------------------------------------------------------------------
// Mouse Events
// On touch devices, mouse events are emulated. We don't want that!
function makeMouseEvent(eventName, $el) {
    // TODO Support removing events.
    if ($el._data['_' + eventName])
        return;
    $el._data['_' + eventName] = true;
    if (pointerSupport) {
        $el.on(eventName.replace('mouse', 'pointer'), (e) => {
            if (e.pointerType === 'mouse')
                $el.trigger(eventName, e);
        });
    }
    else if (!touchSupport) {
        $el._el.addEventListener(eventName, (e) => $el.trigger(eventName, e));
    }
}
// -----------------------------------------------------------------------------
// Keyboard Events
function makeKeyEvent($el) {
    // On Android, the keydown event always returns character 229, except for the
    // backspace button which works as expected. Instead, we have to listen to the
    // input event and get the last character of the typed text. Note that this
    // only works if the cursor is at the end, or if the input field gets cleared
    // after every key.
    // Note that e.keyCode is deprecated, but iOS doesn't support e.key yet.
    $el.on('keydown', (e) => {
        if (e.metaKey || e.ctrlKey)
            return;
        if (exports.Browser.isAndroid && e.keyCode === 229)
            return;
        const key = (e.key || String.fromCharCode(e.which)).toLowerCase();
        $el.trigger('key', { code: e.keyCode, key });
    });
    if (exports.Browser.isAndroid && $el.type === 'input') {
        $el.on('input', (e) => {
            const key = e.data[e.data.length - 1].toLowerCase();
            $el.trigger('key', { code: undefined, key });
            $el.value = '';
        });
    }
}
// -----------------------------------------------------------------------------
// Event Creation
const aliases = {
    change: 'propertychange keyup input paste',
    scrollwheel: 'DOMMouseScroll mousewheel',
    pointerdown: pointerSupport ? 'pointerdown' :
        touchSupport ? 'touchstart' : 'mousedown',
    pointermove: pointerSupport ? 'pointermove' :
        touchSupport ? 'touchmove' : 'mousemove',
    pointerup: pointerSupport ? 'pointerup' :
        touchSupport ? 'touchend' : 'mouseup',
    pointercancel: pointerSupport ? 'pointercancel' : 'touchcancel',
    pointerstop: pointerSupport ? 'pointerup pointercancel' :
        touchSupport ? 'touchend touchcancel' : 'mouseup'
};
const customEvents = {
    scroll: makeScrollEvents,
    tap: makeTapEvent,
    clickOutside: makeClickOutsideEvent,
    key: makeKeyEvent,
    mousedown: makeMouseEvent.bind(undefined, 'mousedown'),
    mousemove: makeMouseEvent.bind(undefined, 'mousemove'),
    mouseup: makeMouseEvent.bind(undefined, 'mouseup'),
    pointerenter: makePointerPositionEvents,
    pointerleave: makePointerPositionEvents,
    enterViewport: makeIntersectionEvents,
    exitViewport: makeIntersectionEvents,
    resize: makeResizeEvents
};
function bindEvent($el, event, fn, options) {
    if (event in customEvents) {
        customEvents[event]($el, false);
    }
    else if (event in aliases) {
        const events = words(aliases[event]);
        // Note that the mouse event aliases don't pass through makeMouseEvent()!
        for (const e of events)
            $el._el.addEventListener(e, fn, options);
    }
    else {
        $el._el.addEventListener(event, fn, options);
    }
}
function unbindEvent($el, event, fn) {
    if (event in customEvents) {
        if (!$el._events[event] || !$el._events[event].length) {
            // Remove custom events only when there are no more listeners.
            customEvents[event]($el, true);
        }
    }
    else if (fn && event in aliases) {
        const events = words(aliases[event]);
        for (const e of events)
            $el._el.removeEventListener(e, fn);
    }
    else if (fn) {
        $el._el.removeEventListener(event, fn);
    }
}

// =============================================================================
// -----------------------------------------------------------------------------
// Utility Functions
/** Draws an arc from a to c, with center b. */
function drawArc(a, b, c) {
    const orient = b.x * (c.y - a.y) + a.x * (b.y - c.y) + c.x * (a.y - b.y);
    const sweep = (orient > 0) ? 1 : 0;
    const size = Point.distance(b, a);
    return [a.x, a.y + 'A' + size, size, 0, sweep, 1, c.x, c.y].join(',');
}
function angleSize(angle, options = {}) {
    if (angle.isRight && !options.round)
        return 20;
    return 24 + 20 * (1 - clamp(angle.rad, 0, Math.PI) / Math.PI);
}
function drawAngle(angle, options = {}) {
    let a = angle.a;
    const b = angle.b;
    let c = angle.c;
    const size = options.size || angleSize(angle, options);
    const ba = Point.difference(a, b).unitVector;
    const bc = Point.difference(c, b).unitVector;
    a = Point.sum(b, ba.scale(size));
    c = Point.sum(b, bc.scale(size));
    let p = options.fill ? `M${b.x},${b.y}L` : 'M';
    if (angle.isRight && !options.round) {
        const d = Point.sum(a, bc.scale(size));
        p += `${a.x},${a.y}L${d.x},${d.y}L${c.x},${c.y}`;
    }
    else {
        p += drawArc(a, b, c);
    }
    if (options.fill)
        p += 'Z';
    return p;
}
function drawPath(...points) {
    return 'M' + points.map(p => p.x + ',' + p.y).join('L');
}
// -----------------------------------------------------------------------------
// Arrows and Line Marks
function drawLineMark(x, type) {
    const p = x.perpendicularVector.scale(6);
    const n = x.unitVector.scale(3);
    const m = x.midpoint;
    switch (type) {
        case 'bar':
            return drawPath(m.add(p), m.add(p.inverse));
        case 'bar2':
            return drawPath(m.add(n).add(p), m.add(n).add(p.inverse)) +
                drawPath(m.add(n.inverse).add(p), m.add(n.inverse).add(p.inverse));
        case 'arrow':
            return drawPath(m.add(n.inverse).add(p), m.add(n), m.add(n.inverse).add(p.inverse));
        case 'arrow2':
            return drawPath(m.add(n.scale(-2)).add(p), m, m.add(n.scale(-2)).add(p.inverse)) +
                drawPath(m.add(p), m.add(n.scale(2)), m.add(p.inverse));
        default:
            return '';
    }
}
function arrowPath(start, normal) {
    if (!start || !normal)
        return '';
    const perp = normal.perpendicular;
    const a = start.add(normal.scale(9)).add(perp.scale(9));
    const b = start.add(normal.scale(9)).add(perp.scale(-9));
    return drawPath(a, start, b);
}
function drawLineArrows(x, type) {
    let path = '';
    if (isOneOf(type, 'start', 'both')) {
        path += arrowPath(x.p1, x.unitVector);
    }
    if (isOneOf(type, 'end', 'both')) {
        path += arrowPath(x.p2, x.unitVector.inverse);
    }
    return path;
}
function drawArcArrows(x, type) {
    let path = '';
    if (isOneOf(type, 'start', 'both')) {
        const normal = new Line(x.c, x.start).perpendicularVector.inverse;
        path += arrowPath(x.start, normal);
    }
    if (isOneOf(type, 'end', 'both')) {
        const normal = new Line(x.c, x.end).perpendicularVector;
        path += arrowPath(x.end, normal);
    }
    return path;
}
// -----------------------------------------------------------------------------
// Draw Function
function drawSVG(obj, options = {}) {
    if (obj.type === 'angle') {
        obj = obj;
        return drawAngle(obj, options);
    }
    if (obj.type === 'segment') {
        obj = obj;
        if (obj.p1.equals(obj.p2))
            return '';
        let line = drawPath(obj.p1, obj.p2);
        if (options.mark)
            line += drawLineMark(obj, options.mark);
        if (options.arrows)
            line += drawLineArrows(obj, options.arrows);
        return line;
    }
    if (obj.type === 'ray') {
        obj = obj;
        if (!options.box)
            return '';
        const end = intersections(obj, options.box)[0];
        return end ? drawPath(obj.p1, end) : '';
    }
    if (obj.type === 'line') {
        obj = obj;
        if (!options.box)
            return '';
        const points = intersections(obj, options.box);
        if (points.length < 2)
            return '';
        let line = drawPath(points[0], points[1]);
        if (options.mark)
            line += drawLineMark(obj, options.mark);
        return line;
    }
    if (obj.type === 'circle') {
        obj = obj;
        return `M ${obj.c.x - obj.r} ${obj.c.y} a ${obj.r},${obj.r} 0 1 0 ` +
            `${2 * obj.r} 0 a ${obj.r} ${obj.r} 0 1 0 ${-2 * obj.r} 0`;
    }
    if (obj.type === 'arc') {
        obj = obj;
        let path = 'M' + drawArc(obj.start, obj.c, obj.end);
        if (options.arrows)
            path += drawArcArrows(obj, options.arrows);
        return path;
    }
    if (obj.type === 'sector') {
        obj = obj;
        return `M ${obj.c.x} ${obj.c.y} L ${drawArc(obj.start, obj.c, obj.end)} Z`;
    }
    if (obj.type === 'polyline') {
        obj = obj;
        return drawPath(...obj.points);
    }
    if (obj.type === 'polygon' || obj.type === 'triangle') {
        obj = obj;
        return drawPath(...obj.points) + 'Z';
    }
    if (obj.type === 'rectangle') {
        obj = obj;
        return drawPath(...obj.polygon.points) + 'Z';
    }
    return '';
}

// =============================================================================
// Boost.js | Canvas Drawing
// (c) Mathigon
// =============================================================================
function drawCanvas(ctx, obj, options = {}) {
    if (options.fill)
        ctx.fillStyle = options.fill;
    if (options.opacity)
        ctx.globalAlpha = options.opacity;
    if (options.stroke) {
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth || 1;
        if (options.lineCap)
            ctx.lineCap = options.lineCap;
        if (options.lineJoin)
            ctx.lineJoin = options.lineJoin;
    }
    ctx.beginPath();
    if (obj.type === 'segment') {
        obj = obj;
        ctx.moveTo(obj.p1.x, obj.p1.y);
        ctx.lineTo(obj.p2.x, obj.p2.y);
    }
    else if (obj.type === 'circle') {
        obj = obj;
        ctx.arc(obj.c.x, obj.c.y, obj.r, 0, 2 * Math.PI);
    }
    else if (obj.type === 'polygon' || obj.type === 'triangle') {
        obj = obj;
        ctx.moveTo(obj.points[0].x, obj.points[0].y);
        for (const p of obj.points.slice(1))
            ctx.lineTo(p.x, p.y);
        ctx.closePath();
    }
    else if (obj.type === 'polyline') {
        obj = obj;
        ctx.moveTo(obj.points[0].x, obj.points[0].y);
        for (const p of obj.points.slice(1))
            ctx.lineTo(p.x, p.y);
    }
    // TODO Support for Line, Ray, Arc, Sector, Angle and Rectangle objects
    if (options.fill)
        ctx.fill();
    if (options.stroke)
        ctx.stroke();
}

// =============================================================================
// -----------------------------------------------------------------------------
// Object Observables
const ALPHABETH = 'zyxwvutsrqponmlkjihgfedcba';
/** Creates a new observable. */
function observable(state = {}) {
    // TODO Add stronger typings.
    // TODO Use Proxies rather than .set(0 and .get().
    // TODO Only run callbacks that depend on properties that have changes.
    const changes = [];
    const values = {};
    let n = 1;
    let names = ALPHABETH.split('').map(x => '_' + x);
    function setProperty(key, value) {
        values[key] = value;
        if (key in state)
            return;
        Object.defineProperty(state, key, {
            get: () => values[key],
            set(val) {
                values[key] = val;
                state.update();
            }
        });
    }
    for (const key of Object.keys(state))
        setProperty(key, state[key]);
    // ---------------------------------------------------------------------------
    /** Re-evaluates all functions in this observable. */
    state.update = () => {
        for (const fn of changes)
            fn(values);
    };
    /**
     * Adds a change listener to this observable. If `silent` is false, the
     * listener will also be executed once, immediately.
     */
    state.watch = (fn, silent) => {
        changes.push(fn);
        if (!silent)
            fn(values);
    };
    /** Sets the value of a property of the observable, and triggers an update. */
    state.set = (key, value) => {
        if (values[key] === value)
            return;
        setProperty(key, value);
        state.update();
    };
    /**
     * Assigns one or more properties of a JSON object to this observable, and
     * triggers an update.
     */
    state.assign = (obj) => {
        for (const key of Object.keys(obj))
            setProperty(key, obj[key]);
        state.update();
    };
    /** Generates a new, unique property name for this observable. */
    state.name = () => {
        if (!names.length) {
            n += 1;
            names = ALPHABETH.split('').map(x => repeat('_', n) + x);
        }
        return names.pop();
    };
    return state;
}
// -----------------------------------------------------------------------------
// Model Binding and Templating
/**
 * Converts an expression string into an executable JS function. If `isString`
 * is true, it will replace all `${x}` type expressions within the string and
 * return a concatenated string. If `expr` is true, it will directly return
 * the result of the expression.
 */
function parse(expr, isString = true) {
    // TODO Use native expressions instead of eval().
    let fn = expr.replace(/×/g, '*');
    if (isString) {
        fn = fn.replace(/"/g, '\"')
            .replace(/\${([^}]+)}/g, (x, y) => `" + (${y}) + "`);
        fn = '"' + fn + '"';
    }
    try {
        return new Function('_vars', `try {
      with(_vars) { return ${fn} }
    } catch(_error) {
      if (!(_error instanceof ReferenceError)) console.warn(_error);
      return "";
    }`);
    }
    catch (e) {
        console.warn('WHILE PARSING: ', expr, '\n', e);
        return () => undefined;
    }
}
function makeTemplate(model, property, fromObj, toObj = fromObj) {
    if (fromObj[property].indexOf('${') < 0)
        return;
    const fn = parse(fromObj[property]);
    model.watch(() => toObj[property] = fn(model) || '');
    toObj[property] = fn(model) || '';
}
/**
 * Binds an observable to a DOM element, and parses all attributes as well as
 * the text content. Use `recursive = true` to also bind the observable to all
 * child elements.
 */
function bindObservable($el, observable, recursive = true) {
    for (const a of $el.attributes) {
        // We have to prefix x-path attributes, to avoid SVG errors on load.
        const to = a.name.startsWith('x-') ?
            document.createAttribute(a.name.slice(2)) : a;
        makeTemplate(observable, 'value', a, to);
        if (to !== a)
            $el._el.setAttributeNode(to);
    }
    if ($el.children.length) {
        for (const $c of $el.childNodes) {
            if ($c instanceof Text) {
                makeTemplate(observable, 'textContent', $c);
            }
            else if (recursive) {
                bindObservable($c, observable);
            }
        }
    }
    else if ($el.html.trim()) {
        makeTemplate(observable, 'html', $el);
    }
}

// =============================================================================
// -----------------------------------------------------------------------------
// Base Element Class
class BaseView {
    constructor(_el) {
        this._el = _el;
        this._data = {};
        this._events = {};
        this.type = 'default';
        // Store a reference to this element within the native browser DOM.
        _el._view = this;
    }
    get id() { return this._el.id; }
    get data() { return this._el.dataset; }
    get tagName() {
        return this._el.tagName.toUpperCase();
    }
    equals(el) {
        return this._el === el._el;
    }
    getModel() {
        const parent = this.parent;
        return parent ? (parent.model || parent.getModel()) : observable();
    }
    bindObservable(model, recursive = true) {
        bindObservable(this, model, recursive);
        this.model = model;
        return model;
    }
    /** Adds one or more space-separated classes to this element. */
    addClass(className) {
        for (const c of words(className))
            this._el.classList.add(c);
    }
    removeClass(className) {
        for (const c of words(className))
            this._el.classList.remove(c);
    }
    hasClass(className) {
        return this._el.classList.contains(className);
    }
    toggleClass(className) {
        return this._el.classList.toggle(className);
    }
    /** Toggles multiple space-separated class names based on a condition. */
    setClass(className, condition) {
        if (condition) {
            this.addClass(className);
        }
        else {
            this.removeClass(className);
        }
    }
    attr(attr) { return this._el.getAttribute(attr) || ''; }
    hasAttr(attr) { return this._el.hasAttribute(attr); }
    setAttr(attr, value) {
        this._el.setAttribute(attr, value.toString());
    }
    removeAttr(attr) { this._el.removeAttribute(attr); }
    get attributes() {
        // Array.from() converts the NamedNodeMap into an array (for Safari).
        return Array.from(this._el.attributes || []);
    }
    get html() { return this._el.innerHTML || ''; }
    set html(h) { this._el.innerHTML = h; }
    // Required because TS doesn't allow getters and setters with different types.
    set htmlStr(t) { this._el.textContent = '' + t; }
    get text() { return this._el.textContent || ''; }
    set text(t) { this._el.textContent = t; }
    // Required because TS doesn't allow getters and setters with different types.
    set textStr(t) { this._el.textContent = '' + t; }
    /** Blurs this DOM element. */
    blur() { this._el.blur(); }
    /** Focuses this DOM element. */
    focus() { this._el.focus(); }
    // -------------------------------------------------------------------------
    // Scrolling and Dimensions
    get bounds() { return this._el.getBoundingClientRect(); }
    /** Checks if this element is currently visible in the viewport. */
    get isInViewport() {
        if (this.height === 0)
            return false;
        const bounds = this.bounds;
        return isBetween(bounds.top, -bounds.height, exports.Browser.height);
    }
    get topLeftPosition() {
        const bounds = this.bounds;
        return new Point(bounds.left, bounds.top);
    }
    get boxCenter() {
        const box = this.bounds;
        return new Point(box.left + box.width / 2, box.top + box.height / 2);
    }
    get scrollWidth() { return this._el.scrollWidth; }
    get scrollHeight() { return this._el.scrollHeight; }
    get scrollTop() { return this._el.scrollTop; }
    get scrollLeft() { return this._el.scrollLeft; }
    set scrollTop(y) {
        this._el.scrollTop = y;
        this.trigger('scroll', { top: y, left: this.scrollLeft });
    }
    set scrollLeft(x) {
        this._el.scrollLeft = x;
        this.trigger('scroll', { top: this.scrollTop, left: x });
    }
    /** Scrolls the element to a specific position. */
    scrollTo(pos, time = 1000, easing = 'cubic') {
        if (pos < 0)
            pos = 0;
        const startPosition = this.scrollTop;
        const distance = pos - startPosition;
        if (this._data['scrollAnimation'])
            this._data['scrollAnimation'].cancel();
        // TODO Also cancel animation after manual scroll events.
        this._data['scrollAnimation'] = animate(t => {
            const y = startPosition + distance * ease(easing, t);
            this.scrollTop = y;
            this.trigger('scroll', { top: y });
        }, time);
    }
    /** Scrolls the element by a given distance. */
    scrollBy(distance, time = 1000, easing = 'cubic') {
        if (!distance)
            return;
        this.scrollTo(this.scrollTop + distance, time, easing);
    }
    // -------------------------------------------------------------------------
    // Styles
    /**
     * Retrieves or sets CSS properties on this element. Examples:
     *   * $el.css('color');  // returns 'red'
     *   * $el.css('color', 'blue');
     *   * $el.css({color: 'blue'});
     */
    css(props, value) {
        if (value === undefined) {
            if (typeof props === 'string') {
                return window.getComputedStyle(this._el).getPropertyValue(props);
            }
            else {
                const keys = Object.keys(props);
                for (const p of keys)
                    this._el.style.setProperty(p, '' + props[p]);
            }
        }
        else if (typeof props === 'string') {
            this._el.style.setProperty(props, '' + value);
        }
    }
    /** Shortcut for getting the CSS transform style of an element. */
    get transform() {
        return this.css('transform').replace('none', '');
    }
    get transformMatrix() {
        const transform = this.transform;
        if (!transform)
            return [[1, 0, 0], [0, 1, 0]];
        const coords = transform.match(/matrix\(([0-9,.\s\-]*)\)/);
        if (!coords || !coords[1])
            return [[1, 0, 0], [0, 1, 0]];
        const matrix = coords[1].split(',');
        return [[+matrix[0], +matrix[2], +matrix[4]],
            [+matrix[1], +matrix[3], +matrix[5]]];
    }
    /** Finds the x and y scale of this element. */
    get scale() {
        const matrix = this.transformMatrix;
        return [matrix[0][0], matrix[1][1]];
    }
    /** Sets the CSS transform on this element. */
    setTransform(posn, angle = 0, scale = 1) {
        let t = '';
        if (posn)
            t +=
                `translate(${roundTo(posn.x, 0.1)}px,${roundTo(posn.y, 0.1)}px)`;
        if (angle)
            t += ` rotate(${angle}rad)`;
        if (scale)
            t += ` scale(${scale})`;
        this._el.style.transform = t;
    }
    /** Sets the CSS transform of this element to an x/y translation. */
    translate(x, y) {
        this.setTransform(new Point(x, y));
    }
    /**
     * Makes the element visible. Use the `data-display` attribute to determine
     * how this is done. Possible options are `visibility`, to use CSS visibility,
     * or CSS display values. The default is `display: block`.
     */
    show() {
        if (this.hasAttr('hidden'))
            this.removeAttr('hidden');
        if (this.data['display'] === 'visibility') {
            this._el.style.visibility = 'visible';
        }
        else {
            this._el.style.display = this.data.display || 'block';
        }
    }
    /**
     * Makes the element invisible, using CSS visibility (if
     * `data-display="visibility"`), or `display: none`.
     */
    hide() {
        if (this.data['display'] === 'visibility') {
            this._el.style.visibility = 'hidden';
        }
        else {
            this._el.style.display = 'none';
        }
    }
    /** Hides or shows the element based on a boolean value. */
    toggle(show) {
        if (show) {
            this.show();
        }
        else {
            this.hide();
        }
    }
    // -------------------------------------------------------------------------
    // DOM Manipulation
    /** Checks if an element matches a given CSS selector. */
    is(selector) {
        if (this._el.matches)
            return this._el.matches(selector);
        return Array.from(document.querySelectorAll(selector)).includes(this._el);
    }
    /** Finds the index of an elements, in the list of its siblings. */
    index() {
        let i = 0;
        let child = this._el;
        while ((child = (child.previousSibling || undefined)) !== undefined)
            ++i;
        return i;
    }
    /** Adds a new child element at the beginning of this one. */
    prepend(newChild) {
        const children = this._el.childNodes;
        if (children.length) {
            this._el.insertBefore(newChild._el, children[0]);
        }
        else {
            this._el.appendChild(newChild._el);
        }
    }
    /** Adds a new child element at the end of this one. */
    append(newChild) {
        this._el.appendChild(newChild._el);
    }
    /** Adds a new element immediately before this one, as a sibling. */
    insertBefore(newChild) {
        this.parent._el.insertBefore(newChild._el, this._el);
    }
    /** Adds a new element immediately after this one, as a sibling. */
    insertAfter(newChild) {
        const next = this._el.nextSibling;
        if (next) {
            this.parent._el.insertBefore(newChild._el, next);
        }
        else {
            this.parent._el.appendChild(newChild._el);
        }
    }
    /** Returns this element's next sibling, or undefined. */
    get next() {
        return $(this._el.nextSibling);
    }
    /** Returns this element's previous sibling, or undefined. */
    get prev() {
        return $(this._el.previousSibling);
    }
    /** The first child element matching a given selector. */
    $(selector) { return $(selector, this); }
    /** All child elements matching a given selector. */
    $$(selector) { return $$(selector, this); }
    /** Returns this element's parent, or undefined. */
    get parent() {
        // Note: parentNode breaks on document.matches.
        return $(this._el.parentElement || undefined);
    }
    /** Finds all parent elements that match a specific selector. */
    parents(selector) {
        const result = [];
        let parent = this.parent;
        while (parent) {
            if (!selector || parent.is(selector))
                result.push(parent);
            parent = parent.parent;
        }
        return result;
    }
    /** Checks if this element has one of the given elements as parent. */
    hasParent(...$p) {
        const tests = $p.map(p => p._el);
        let parent = this._el.parentNode;
        while (parent) {
            if (isOneOf(parent, ...tests))
                return true;
            parent = parent.parentNode;
        }
        return false;
    }
    /** Returns an array of all children of this element. */
    get children() {
        return Array.from(this._el.children || [], n => $(n));
    }
    /** Returns an array of all child nodes, including text nodes. */
    get childNodes() {
        return Array.from(this._el.childNodes, (node) => {
            return node instanceof Text ? node : $(node);
        });
    }
    /** Removes this element. */
    remove() {
        if (this._el && this._el.parentNode) {
            this._el.parentNode.removeChild(this._el);
        }
        // TODO More cleanup: remove event listeners, clean children, etc.
        // this._el = this._data = this._events = undefined;
    }
    /** Removes all children of this element. */
    removeChildren() {
        while (this._el.firstChild)
            this._el.removeChild(this._el.firstChild);
    }
    // -------------------------------------------------------------------------
    // Events
    /** Binds one ore more space-separated event listeners on this element. */
    on(events, callback, options) {
        for (const e of words(events)) {
            if (e in this._events) {
                if (!this._events[e].includes(callback))
                    this._events[e].push(callback);
            }
            else {
                this._events[e] = [callback];
            }
            bindEvent(this, e, callback, options);
        }
    }
    /** Binds a one-time event listener on this element. */
    one(events, callback, options) {
        const callbackWrap = (e) => {
            this.off(events, callbackWrap);
            callback(e);
        };
        this.on(events, callbackWrap, options);
    }
    /**
     * Removes an event listener on this element. If callback is undefined, it
     * removes all event listeners for this event.
     */
    off(events, callback) {
        for (const e of words(events)) {
            if (e in this._events) {
                this._events[e] = callback ? this._events[e].filter(fn => fn !== callback) : [];
            }
            unbindEvent(this, e, callback);
        }
    }
    /** Triggers a specific event on this element. */
    trigger(events, args = {}) {
        for (const e of words(events)) {
            if (!this._events[e])
                return;
            for (const fn of this._events[e])
                fn.call(this, args);
        }
    }
    /**
     * Binds an event listener for a specific key that is pressed while this
     * element is in focus.
     */
    onKeyDown(keys, callback) {
        const keylist = words(keys).map(k => KEY_CODES[k] || k);
        this._el.addEventListener('keydown', (e) => {
            if (keylist.indexOf(e.keyCode) >= 0)
                callback(e);
        });
    }
    /** Returns a promise that is resolved when an event is triggered. */
    onPromise(event, resolveImmediately = false) {
        if (resolveImmediately)
            return Promise.resolve();
        return new Promise((resolve) => this.one('solve', () => resolve()));
    }
    // -------------------------------------------------------------------------
    // Animations
    /**
     * Animates multiple CSS properties of this element, with a given duration,
     * delay and ease function.
     */
    animate(rules, duration = 400, delay = 0, easing = 'ease-in-out') {
        return transition(this, rules, duration, delay, easing);
    }
    /**
     * Runs an enter animation on this element. Valid effect names are
     *   * 'fade', 'pop' and 'descend'
     *   * 'draw' and 'draw-reverse'
     *   * 'slide' and 'slide-down'
     *   * 'reveal', 'reveal-left' and 'reveal-right'
     */
    enter(effect = 'fade', duration = 500, delay = 0) {
        return enter(this, effect, duration, delay);
    }
    /**
     * Runs an exit animation on this element. See `.enter()` for options.
     */
    exit(effect = 'fade', duration = 500, delay = 0, remove = false) {
        return exit(this, effect, duration, delay, remove);
    }
    /**
     * Triggers a CSS animation in an element by adding a class and removing it
     * after the `animationEnd` event.
     */
    effect(className) {
        this.one('animationend', () => this.removeClass('effects-' + className));
        this.addClass('effects-' + className);
    }
    // -------------------------------------------------------------------------
    // Utilities
    /**
     * Creates a copy of this element.
     * @param {boolean=} recursive
     * @param {boolean=} withStyles Whether to inline all styles.
     * @returns {Element}
     */
    copy(recursive = true, withStyles = true) {
        const $copy = $(this._el.cloneNode(recursive));
        if (withStyles)
            $copy.copyInlineStyles(this, recursive);
        return $copy;
    }
    copyInlineStyles($source, recursive = true) {
        const style = window.getComputedStyle($source._el);
        for (const s of Array.from(style))
            this.css(s, style.getPropertyValue(s));
        if (recursive) {
            const children = this.children;
            const sourceChildren = $source.children;
            for (let i = 0; i < children.length; ++i) {
                children[i].copyInlineStyles(sourceChildren[i], true);
            }
        }
    }
}
// -----------------------------------------------------------------------------
// HTML Elements
class HTMLBaseView extends BaseView {
    get offsetTop() { return this._el.offsetTop; }
    get offsetLeft() { return this._el.offsetLeft; }
    get offsetParent() { return $(this._el.offsetParent || undefined); }
    /** Returns this element's width, including border and padding. */
    get width() { return this._el.offsetWidth; }
    /** Returns this element's height, including border and padding. */
    get height() { return this._el.offsetHeight; }
    /** Returns this element's width, excluding border and padding. */
    get innerWidth() {
        const left = parseFloat(this.css('padding-left'));
        const right = parseFloat(this.css('padding-right'));
        return this._el.clientWidth - left - right;
    }
    /** Returns this element's height, excluding border and padding. */
    get innerHeight() {
        const bottom = parseFloat(this.css('padding-bottom'));
        const top = parseFloat(this.css('padding-top'));
        return this._el.clientHeight - bottom - top;
    }
    /** Returns this element's width, including margins. */
    get outerWidth() {
        const left = parseFloat(this.css('margin-left'));
        const right = parseFloat(this.css('margin-right'));
        return this.width + left + right;
    }
    /** Returns this element's height, including margins. */
    get outerHeight() {
        const bottom = parseFloat(this.css('margin-bottom'));
        const top = parseFloat(this.css('margin-top'));
        return this.height + bottom + top;
    }
    /** @returns {number} */
    get positionTop() {
        let el = this._el;
        let offset = 0;
        while (el) {
            offset += el.offsetTop;
            el = el.offsetParent;
        }
        return offset;
    }
    /** @returns {number} */
    get positionLeft() {
        let el = this._el;
        let offset = 0;
        while (el) {
            offset += el.offsetLeft;
            el = el.offsetParent;
        }
        return offset;
    }
    /** Calculates the element offset relative to any other parent element. */
    offset(parent) {
        if (parent._el === this._el.offsetParent) {
            // Get offset from immediate parent
            const top = this.offsetTop + parent._el.clientTop;
            const left = this.offsetLeft + parent._el.clientLeft;
            const bottom = top + this.height;
            const right = left + this.width;
            return { top, left, bottom, right };
        }
        else {
            // Get offset based on any other element
            const parentBox = parent._el.getBoundingClientRect();
            const box = this._el.getBoundingClientRect();
            return {
                top: box.top - parentBox.top, left: box.left - parentBox.left,
                bottom: box.bottom - parentBox.top, right: box.right - parentBox.left
            };
        }
    }
}
// -----------------------------------------------------------------------------
// SVG Elements
class SVGBaseView extends BaseView {
    constructor() {
        super(...arguments);
        this.type = 'svg';
    }
    /** Returns the owner `<svg>` which this element is a child of. */
    get $ownerSVG() {
        return $(this._el.ownerSVGElement || undefined);
    }
    // See https://www.chromestatus.com/features/5724912467574784
    get width() { return this.bounds.width; }
    get height() { return this.bounds.height; }
    // SVG Elements don't have offset properties. We instead use the position of
    // the first non-SVG parent, plus the margin of the SVG owner, plus the SVG
    // position of the individual element. This doesn't work for absolutely
    // positioned SVG elements, and some other edge cases.
    get positionLeft() {
        const svgLeft = this._el.getBBox().x + this._el.getCTM().e;
        return this.$ownerSVG.positionLeft + svgLeft;
    }
    get positionTop() {
        const svgTop = this._el.getBBox().y + this._el.getCTM().f;
        return this.$ownerSVG.positionTop + svgTop;
    }
    get inverseTransformMatrix() {
        const m = this._el.getScreenCTM().inverse();
        const matrix = [[m.a, m.c, m.e], [m.b, m.d, m.f]];
        // Firefox doesn't account for the CSS transform of parent elements.
        // TODO Use matrix product of all parent's transforms, not just the
        // translation of the immediate parent.
        if (exports.Browser.isFirefox) {
            const transform = this.transformMatrix;
            matrix[0][2] -= transform[0][2];
            matrix[1][2] -= transform[1][2];
        }
        return matrix;
    }
    setTransform(posn, angle = 0, scale = 1) {
        const t1 = posn ?
            `translate(${roundTo(posn.x, 0.1)} ${roundTo(posn.y, 0.1)})` :
            '';
        const t2 = nearlyEquals(angle, 0) ? '' : `rotate(${angle * 180 / Math.PI})`;
        const t3 = nearlyEquals(scale, 1) ? '' : `scale(${scale})`;
        this.setAttr('transform', [t1, t2, t3].join(' '));
    }
    /**
     * Finds the total stroke length of this element. Similar to the SVG
     * `getTotalLength()` function, but works for a wider variety of elements.
     */
    get strokeLength() {
        if (this._el instanceof SVGGeometryElement) {
            return this._el.getTotalLength();
        }
        else {
            const dim = this.bounds;
            return 2 * dim.height + 2 * dim.width;
        }
    }
    /**
     * Gets the coordinates of the point at a position `p` along the length of the
     * stroke of this `<path>` element, where `0 ≤ p ≤ 1`.
     */
    getPointAt(p) {
        if (this._el instanceof SVGGeometryElement) {
            const point = this._el.getPointAtLength(p * this.strokeLength);
            return new Point(point.x, point.y);
        }
        else {
            return new Point(0, 0);
        }
    }
    /** Returns a list of all points along an SVG `<path>` element. */
    get points() {
        const points = this.attr('d');
        if (!points)
            return [];
        return points.replace(/[MZ]/g, '').split(/[LA]/).map((x) => {
            const p = x.split(',');
            return new Point(+last(p, 1), +last(p));
        });
    }
    /** Sets the list of points for an SVG `<path>` element.c*/
    set points(p) {
        const d = p.length ? 'M' + p.map(x => x.x + ',' + x.y).join('L') : '';
        this.setAttr('d', d);
    }
    /** Appends a new point to an SVG `<path>` element. */
    addPoint(p) {
        const d = this.attr('d') + ' L ' + p.x + ',' + p.y;
        this.setAttr('d', d);
    }
    /** Finds the center of an SVG `<circle>` element. */
    get center() {
        const x = +this.attr(this.tagName === 'TEXT' ? 'x' : 'cx');
        const y = +this.attr(this.tagName === 'TEXT' ? 'y' : 'cy');
        return new Point(x, y);
    }
    /** Sets the center of an SVG `<circle>` or `<text>` element. */
    setCenter(c) {
        this.setAttr(this.tagName === 'TEXT' ? 'x' : 'cx', c.x);
        this.setAttr(this.tagName === 'TEXT' ? 'y' : 'cy', c.y);
    }
    /** Sets the end points of an SVG `<line>` element. */
    setLine(p, q) {
        this.setAttr('x1', p.x);
        this.setAttr('y1', p.y);
        this.setAttr('x2', q.x);
        this.setAttr('y2', q.y);
    }
    /** Sets the bounds of an SVG `<rectangle>` element. */
    setRect(rect) {
        this.setAttr('x', rect.p.x);
        this.setAttr('y', rect.p.y);
        this.setAttr('width', rect.w);
        this.setAttr('height', rect.h);
    }
    /** Draws a generic geometry object onto an SVG `<path>` element. */
    draw(obj, options = {}) {
        const attributes = {
            mark: this.attr('mark'),
            arrows: this.attr('arrows'),
            size: (+this.attr('size')) || undefined,
            fill: this.hasClass('fill'),
            round: this.hasAttr('round')
        };
        this.setAttr('d', drawSVG(obj, applyDefaults(options, attributes)));
    }
}
class SVGParentView extends SVGBaseView {
    /** Returns the viewport coordinates of this `<svg>` element. */
    get viewBox() {
        return this._el.viewBox.baseVal || { width: 0, height: 0 };
    }
    get $ownerSVG() {
        return this;
    }
    get positionLeft() {
        return parseInt(this.css('margin-left')) + this.parent.positionLeft;
    }
    get positionTop() {
        return parseInt(this.css('margin-top')) + this.parent.positionTop;
    }
    /** Returns the intrinsic width of this `<svg>` element. */
    get svgWidth() {
        return this.viewBox.width || this.width;
    }
    /** Returns the intrinsic height of this `<svg>` element. */
    get svgHeight() {
        return this.viewBox.height || this.height;
    }
    /** Converts an SVG element into a PNG data URI. */
    pngImage(size) {
        return __awaiter(this, void 0, void 0, function* () {
            const $copy = this.copy(true, true);
            const width = size || this.svgWidth;
            const height = size || this.svgHeight;
            $copy.setAttr('width', width);
            $copy.setAttr('height', height);
            const data = new XMLSerializer().serializeToString($copy._el);
            let url = 'data:image/svg+xml;utf8,' + encodeURIComponent(data);
            url = url.replace('svg ', 'svg xmlns="http://www.w3.org/2000/svg" ');
            // const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
            // const url = window.URL.createObjectURL(svgBlob);
            const $canvas = $N('canvas', { width, height });
            $canvas.ctx.fillStyle = '#fff';
            $canvas.ctx.fillRect(0, 0, width, height);
            const image = yield loadImage(url);
            $canvas.ctx.drawImage(image, 0, 0, width, height);
            return $canvas.pngImage;
            // window.URL.revokeObjectURL(url);
        });
    }
}
// -----------------------------------------------------------------------------
// Window Element (<html> and <body>)
class WindowView extends HTMLBaseView {
    constructor() {
        super(...arguments);
        this.type = 'window';
    }
    get width() { return window.innerWidth; }
    get height() { return window.innerHeight; }
    get innerWidth() { return window.innerWidth; }
    get innerHeight() { return window.innerHeight; }
    get outerWidth() { return window.outerWidth; }
    get outerHeight() { return window.outerHeight; }
    get scrollWidth() { return document.body.scrollWidth; }
    get scrollHeight() { return document.body.scrollHeight; }
    get scrollTop() { return window.pageYOffset; }
    get scrollLeft() { return window.pageXOffset; }
    set scrollTop(y) {
        document.body.scrollTop = document.documentElement.scrollTop = y;
        this.trigger('scroll', { top: y, left: this.scrollLeft });
    }
    set scrollLeft(x) {
        document.body.scrollLeft = document.documentElement.scrollLeft = x;
        this.trigger('scroll', { top: this.scrollTop, left: x });
    }
}
class FormView extends HTMLBaseView {
    constructor() {
        super(...arguments);
        this.type = 'form';
    }
    get action() { return this._el.action; }
    /** Summarises the data for an HTML <form> element in an JSON Object. */
    get formData() {
        const data = {};
        for (const el of Array.from(this._el.elements)) {
            const id = el.name || el.id;
            if (id)
                data[id] = el.value;
        }
        return data;
    }
    get isValid() {
        return this._el.checkValidity();
    }
}
class InputView extends HTMLBaseView {
    constructor() {
        super(...arguments);
        this.type = 'input';
    }
    get checked() {
        return this._el instanceof HTMLInputElement ? this._el.checked : false;
    }
    get value() { return this._el.value; }
    set value(v) { this._el.value = v; }
    /** Binds a change event listener. */
    change(callback) {
        let value = '';
        this.on('change', () => {
            if (this.value === value)
                return;
            value = this.value.trim();
            callback(value);
        });
    }
    validate(callback) {
        this.change(value => this.setValidity(callback(value)));
    }
    setValidity(str) {
        this._el.setCustomValidity(str);
    }
    get isValid() {
        return this._el.checkValidity();
    }
}
// -----------------------------------------------------------------------------
// Canvas Elements (<canvas>)
class CanvasView extends HTMLBaseView {
    constructor() {
        super(...arguments);
        this.type = 'canvas';
    }
    /** Returns the drawing context for a `<canvas>` element. */
    getContext(c = '2d', options = {}) {
        return this._el.getContext(c, options);
    }
    /** Converts an Canvas element into a PNG data URI. */
    get pngImage() {
        return this._el.toDataURL('image/png');
    }
    /** Returns the intrinsic pixel width of this `<canvas>` element. */
    get canvasWidth() {
        return this._el.width;
    }
    /** Returns the intrinsic pixel height of this `<canvas>` element. */
    get canvasHeight() {
        return this._el.height;
    }
    /** Cached reference to the 2D context for this `<canvas>` element. */
    get ctx() {
        if (!this._ctx)
            this._ctx = this.getContext();
        return this._ctx;
    }
    /** Draws a generic geometry object ont a `<canvas>` element. */
    draw(obj, options = {}) {
        this.ctx.save();
        drawCanvas(this.ctx, obj, options);
        this.ctx.restore();
    }
    /** Clears this canvas. */
    clear() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
}
// -----------------------------------------------------------------------------
// Media Elements (<video> and <audio>)
class MediaView extends HTMLBaseView {
    /** Starts playback on a media element. */
    play() {
        return this._el.play() || Promise.resolve();
    }
    /** Pauses playback on a media element. */
    pause() {
        return this._el.pause();
    }
}
// -----------------------------------------------------------------------------
// Element Selectors and Constructors
const SVG_TAGS = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
    'g', 'defs', 'marker', 'line', 'text', 'pattern', 'mask', 'svg', 'foreignObject'];
/**
 * Finds the Element that matches a specific CSS selector, or creates a new
 * Element wrapper around a native HTMLElement instance.
 */
function $(query, context) {
    if (!query)
        return undefined;
    const c = context ? context._el : document.documentElement;
    const el = (typeof query === 'string') ? c.querySelector(query) : query;
    if (!el)
        return undefined;
    if (el._view)
        return el._view;
    const tagName = (el.tagName || '').toLowerCase();
    if (tagName === 'svg') {
        return new SVGParentView(el);
    }
    else if (tagName === 'canvas') {
        return new CanvasView(el);
    }
    else if (tagName === 'form') {
        return new FormView(el);
    }
    else if (tagName === 'input' || tagName === 'select') {
        return new InputView(el);
    }
    else if (tagName === 'video' || tagName === 'audio') {
        return new MediaView(el);
    }
    else if (SVG_TAGS.includes(tagName)) {
        // TODO <mask> and <pattern> are not SVGGraphicsElements.
        return new SVGBaseView(el);
    }
    else {
        return new HTMLBaseView(el);
    }
}
/** Finds all elements that match a specific CSS selector. */
function $$(selector, context) {
    const c = context ? context._el : document.documentElement;
    const els = selector ? c.querySelectorAll(selector) : [];
    return Array.from(els, el => $(el));
}
/** Creates a new Element instance from a given set of options. */
function $N(tag, attributes = {}, parent) {
    const el = !SVG_TAGS.includes(tag) ? document.createElement(tag) :
        document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) {
        if (value === undefined)
            continue;
        if (key === 'id') {
            el.id = value;
        }
        else if (key === 'html') {
            el.innerHTML = value;
        }
        else if (key === 'text') {
            el.textContent = value;
        }
        else if (key === 'path') {
            el.setAttribute('d', drawSVG(value));
        }
        else {
            el.setAttribute(key, value);
        }
    }
    const $el = $(el);
    if (parent)
        parent.append($el);
    return $el;
}
const $body = new WindowView(document.body);
const $html = new WindowView(document.documentElement);

// =============================================================================
const KEY_CODES = {
    backspace: 8,
    tab: 9,
    enter: 13,
    shift: 16,
    ctrl: 17,
    alt: 18,
    pause: 19,
    capslock: 20,
    escape: 27,
    space: 32,
    pageup: 33,
    pagedown: 34,
    end: 35,
    home: 36,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    insert: 45,
    'delete': 46
};
(function (Browser) {
    const ua = window.navigator.userAgent.toLowerCase();
    Browser.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    Browser.isRetina = ((window.devicePixelRatio || 1) > 1);
    Browser.isTouch = window.Touch || 'ontouchstart' in window;
    Browser.isChrome = !!window.chrome;
    Browser.isFirefox = ua.indexOf('firefox') >= 0;
    Browser.isAndroid = ua.indexOf('android') >= 0;
    Browser.isIOS = /iphone|ipad|ipod/i.test(ua);
    Browser.isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    /** Forces a re-paint. This is useful when updating transition properties. */
    function redraw() {
        document.body.offsetHeight; /* jshint ignore:line */
    }
    Browser.redraw = redraw;
    // ---------------------------------------------------------------------------
    // Load Events
    const loadQueue = [];
    let loaded = false;
    function afterLoad() {
        if (loaded)
            return;
        loaded = true;
        for (const fn of loadQueue)
            fn();
        setTimeout(resize);
    }
    window.onload = afterLoad;
    document.addEventListener('DOMContentLoaded', afterLoad);
    /** Binds an event listener that is triggered when the page is loaded. */
    function ready(fn) {
        if (loaded) {
            fn();
        }
        else {
            loadQueue.push(fn);
        }
    }
    Browser.ready = ready;
    const resizeCallbacks = [];
    Browser.width = window.innerWidth;
    Browser.height = window.innerHeight;
    const doResize = throttle(() => {
        Browser.width = window.innerWidth;
        Browser.height = window.innerHeight;
        for (const fn of resizeCallbacks)
            fn({ width: Browser.width, height: Browser.height });
        $body.trigger('scroll', { top: $body.scrollTop });
    });
    function onResize(fn) {
        fn({ width: Browser.width, height: Browser.height });
        resizeCallbacks.push(fn);
    }
    Browser.onResize = onResize;
    function offResize(fn) {
        const i = resizeCallbacks.indexOf(fn);
        if (i >= 0)
            resizeCallbacks.splice(i, 1);
    }
    Browser.offResize = offResize;
    function resize() {
        doResize();
    }
    Browser.resize = resize;
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        if (Browser.width === newWidth && Browser.height === newHeight)
            return;
        Browser.width = newWidth;
        Browser.height = newHeight;
        doResize();
    });
    // ---------------------------------------------------------------------------
    // Location Hash
    /** Returns the hash string of the current window. */
    function getHash() {
        return window.location.hash.slice(1);
    }
    Browser.getHash = getHash;
    /** Set the hash string of the current window. */
    function setHash(h) {
        // Prevent scroll to top when resetting hash.
        const scroll = document.body.scrollTop;
        window.location.hash = h;
        document.body.scrollTop = scroll;
    }
    Browser.setHash = setHash;
    // ---------------------------------------------------------------------------
    // Cookies
    /** Returns a JSON object of all cookies. */
    function getCookies() {
        const pairs = document.cookie.split(';');
        const result = {};
        for (let i = 0, n = pairs.length; i < n; ++i) {
            const pair = pairs[i].split('=');
            pair[0] = pair[0].replace(/^\s+|\s+$/, '');
            result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return result;
    }
    Browser.getCookies = getCookies;
    function getCookie(name) {
        const v = document.cookie.match(new RegExp(`(^|;) ?${name}=([^;]*)(;|$)`));
        return v ? v[2] : undefined;
    }
    Browser.getCookie = getCookie;
    function setCookie(name, value, maxAge = 60 * 60 * 24 * 365) {
        document.cookie = `${name}=${value};path=/;max-age=${maxAge}`;
    }
    Browser.setCookie = setCookie;
    function deleteCookie(name) {
        setCookie(name, '', -1);
    }
    Browser.deleteCookie = deleteCookie;
    // ---------------------------------------------------------------------------
    // Local Storage
    const STORAGE_KEY = '_M';
    function setStorage(key, value) {
        const keys = (key || '').split('.');
        const storage = safeToJSON(window.localStorage.getItem(STORAGE_KEY) || undefined);
        let path = storage;
        for (let i = 0; i < keys.length - 1; ++i) {
            if (path[keys[i]] == undefined)
                path[keys[i]] = {};
            path = path[keys[i]];
        }
        path[keys[keys.length - 1]] = value;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    }
    Browser.setStorage = setStorage;
    function getStorage(key) {
        let path = safeToJSON(window.localStorage.getItem(STORAGE_KEY) || undefined);
        if (!key)
            return path;
        const keys = (key || '').split('.');
        const lastKey = keys.pop();
        for (const k of keys) {
            if (!(k in path))
                return undefined;
            path = path[k];
        }
        return path[lastKey];
    }
    Browser.getStorage = getStorage;
    function deleteStorage(key) {
        if (key) {
            setStorage(key, undefined);
        }
        else {
            window.localStorage.setItem(STORAGE_KEY, '');
        }
    }
    Browser.deleteStorage = deleteStorage;
    // ---------------------------------------------------------------------------
    // Keyboard Event Handling
    /** The current active element on the page (e.g. and `<input>`). */
    function getActiveInput() {
        const active = document.activeElement;
        return active === document.body ? undefined : $(active);
    }
    Browser.getActiveInput = getActiveInput;
    /** Binds an event listener that is fired when a key is pressed. */
    function onKey(keys, fn, up = false) {
        const keyNames = words(keys);
        const keyCodes = keyNames.map(k => KEY_CODES[k] || k);
        const event = up ? 'keyup' : 'keydown';
        document.addEventListener(event, function (e) {
            const $active = getActiveInput();
            if ($active && $active.is('input, textarea, [contenteditable]'))
                return;
            const i = keyCodes.indexOf(e.keyCode);
            if (i >= 0)
                fn(e, keyNames[i]);
        });
    }
    Browser.onKey = onKey;
})(exports.Browser || (exports.Browser = {}));
// -----------------------------------------------------------------------------
// Polyfill for external SVG imports
const IEUA = /\bTrident\/[567]\b|\bMSIE (?:9|10)\.0\b/;
const webkitUA = /\bAppleWebKit\/(\d+)\b/;
const EdgeUA = /\bEdge\/12\.(\d+)\b/;
const polyfill = IEUA.test(navigator.userAgent) ||
    +(navigator.userAgent.match(EdgeUA) || [])[1] < 10547 ||
    +(navigator.userAgent.match(webkitUA) || [])[1] < 537;
const requests = {};
/** Replaces SVG `<use>` imports that are not supported by older browsers. */
function replaceSvgImports() {
    if (!polyfill)
        return;
    const uses = Array.from(document.querySelectorAll('svg > use'));
    uses.forEach(function (use) {
        const src = use.getAttribute('xlink:href');
        const [url, id] = src.split('#');
        if (!url.length || !id)
            return;
        const svg = use.parentNode;
        svg.removeChild(use);
        if (!(url in requests))
            requests[url] = fetch(url).then(r => r.text());
        const request = requests[url];
        request.then((response) => {
            const doc = document.implementation.createHTMLDocument('');
            doc.documentElement.innerHTML = response;
            const icon = doc.getElementById(id);
            const clone = icon.cloneNode(true);
            const fragment = document.createDocumentFragment();
            while (clone.childNodes.length)
                fragment.appendChild(clone.firstChild);
            svg.appendChild(fragment);
        });
    });
}

// =============================================================================
// Prevent animations on page load.
let isReady = false;
setTimeout(() => isReady = true);
const BOUNCE_IN = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
const BOUNCE_OUT = 'cubic-bezier(0.68, -0.275, 0.825, 0.115)';
const ResolvedAnimation = { cancel: () => { }, promise: Promise.resolve() };
/**
 * Runs an animation. If no duration is provided, the animation will run
 * indefinitely, and call `callback` with the time since start as first
 * argument. If a duration is provided, the first callback argument is instead
 * the proportion of the duration passed (between 0 and 1). The second callback
 * argument is the time difference since the last animation frame, and the
 * third callback argument is a `cancel()` function to stop the animation.
 */
function animate(callback, duration) {
    if (duration === 0) {
        callback(1, 0, () => { });
        return ResolvedAnimation;
    }
    const startTime = Date.now();
    const deferred = defer();
    let lastTime = 0;
    let running = true;
    const cancel = () => {
        running = false;
        deferred.reject();
    };
    function getFrame() {
        if (running && (!duration || lastTime <= duration))
            window.requestAnimationFrame(getFrame);
        const time = Date.now() - startTime;
        callback(duration ? Math.min(1, time / duration) : time, time - lastTime, cancel);
        if (duration && time >= duration)
            deferred.resolve();
        lastTime = time;
    }
    getFrame();
    return { cancel, promise: deferred.promise };
}
// -----------------------------------------------------------------------------
// Easing
function easeIn(type, t = 0, s = 0) {
    switch (type) {
        case 'quad':
            return Math.pow(t, 2);
        case 'cubic':
            return Math.pow(t, 3);
        case 'quart':
            return Math.pow(t, 4);
        case 'quint':
            return Math.pow(t, 5);
        case 'circ':
            return 1 - Math.sqrt(1 - Math.pow(t, 2));
        case 'sine':
            return 1 - Math.cos(t * Math.PI / 2);
        case 'exp':
            return (t <= 0) ? 0 : Math.pow(2, 10 * (t - 1));
        case 'back':
            if (!s)
                s = 1.70158;
            return t * t * ((s + 1) * t - s);
        case 'elastic':
            if (!s)
                s = 0.3;
            return -Math.pow(2, 10 * (t - 1)) *
                Math.sin(((t - 1) * 2 / s - 0.5) * Math.PI);
        case 'swing':
            return 0.5 - Math.cos(t * Math.PI) / 2;
        case 'spring':
            return 1 - (Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6));
        case 'bounce':
            if (t < 1 / 11)
                return 1 / 64 - 7.5625 * (0.5 / 11 - t) * (0.5 / 11 - t); // 121/16 = 7.5625
            if (t < 3 / 11)
                return 1 / 16 - 7.5625 * (2 / 11 - t) * (2 / 11 - t);
            if (t < 7 / 11)
                return 1 / 4 - 7.5625 * (5 / 11 - t) * (5 / 11 - t);
            return 1 - 7.5625 * (1 - t) * (1 - t);
        default:
            return t;
    }
}
/**
 * Applies an easing function to a number `t` between 0 and 1. Options include
 * `quad`, `cubic`, `quart`, `quint`, `circ`, `sine`, `exp`, `back`, `elastic`,
 * `swing`, `spring` and `bounce`, optionally followed by `-in` or `-out`. The
 * `s` parameter is only used by `back` and `elastic` easing.
 */
function ease(type, t = 0, s = 0) {
    if (t === 0)
        return 0;
    if (t === 1)
        return 1;
    const [name, direction] = type.split('-');
    if (direction === 'in')
        return easeIn(name, t, s);
    if (direction === 'out')
        return 1 - easeIn(name, 1 - t, s);
    if (t <= 0.5)
        return easeIn(name, 2 * t, s) / 2;
    return 1 - easeIn(name, 2 * (1 - t), s) / 2;
}
function transition($el, properties, duration = 400, _delay = 0, easing = 'ease-in-out') {
    // Don't play animations while the page is loading.
    if (!isReady) {
        Object.keys(properties).forEach(k => {
            const p = properties[k];
            $el.css(k, Array.isArray(p) ? p[1] : p);
        });
        return ResolvedAnimation;
    }
    if (easing === 'bounce-in')
        easing = BOUNCE_IN;
    if (easing === 'bounce-out')
        easing = BOUNCE_OUT;
    let oldTransition = '';
    if (exports.Browser.isSafari) {
        oldTransition = $el._el.style.transition;
        $el.css('transition', 'none');
        exports.Browser.redraw();
    }
    // Cancel any previous animations
    const currentAnimation = $el._data['animation'];
    if (currentAnimation)
        currentAnimation.cancel();
    const to = {}, from = {};
    const deferred = defer();
    const style = window.getComputedStyle($el._el);
    Object.keys(properties).forEach((k) => {
        const p = properties[k];
        const k1 = toCamelCase(k);
        from[k1] = Array.isArray(p) ? p[0] : style.getPropertyValue(k);
        to[k1] = Array.isArray(p) ? p[1] : p;
        // Set initial style, for the duration of the delay.
        if (_delay)
            $el.css(k, from[k1]);
    });
    // Special rules for animations to height: auto
    const oldHeight = to.height;
    if (to.height === 'auto') {
        to.height =
            total($el.children.map($c => $c.outerHeight)) + 'px';
    }
    let player;
    let cancelled = false;
    delay(() => {
        if (cancelled)
            return;
        player = $el._el.animate([from, to], { duration, easing, fill: 'forwards' });
        player.onfinish = () => {
            if ($el._el)
                Object.keys(properties)
                    .forEach(k => $el.css(k, k === 'height' ? oldHeight : to[k]));
            if (exports.Browser.isSafari)
                $el.css('transition', oldTransition);
            deferred.resolve();
            player.cancel(); // bit ugly, but needed for Safari...
        };
    }, _delay);
    const animation = {
        cancel() {
            cancelled = true;
            if ($el._el)
                Object.keys(properties).forEach(k => $el.css(k, $el.css(k)));
            if (player)
                player.cancel();
        },
        promise: deferred.promise
    };
    // Only allow cancelling of animation in next thread.
    setTimeout(() => $el._data['animation'] = animation);
    return animation;
}
// -----------------------------------------------------------------------------
// Element CSS Animations Effects
// When applying the 'pop' effect, we want to respect all existing transform
// except scale. To do that, we have to expand the matrix() notation.
const CSS_MATRIX = /matrix\([0-9.\-\s]+,[0-9.\-\s]+,[0-9.\-\s]+,[0-9.\-\s]+,([0-9.\-\s]+),([0-9.\-\s]+)\)/;
function enter($el, effect = 'fade', duration = 500, _delay = 0) {
    $el.show();
    if (!isReady)
        return ResolvedAnimation;
    if (effect === 'fade') {
        return transition($el, { opacity: [0, 1] }, duration, _delay);
    }
    else if (effect === 'pop') {
        const transform = $el.transform.replace(/scale\([0-9.]*\)/, '')
            .replace(CSS_MATRIX, 'translate($1px,$2px)');
        // TODO Merge into one transition.
        transition($el, { opacity: [0, 1] }, duration, _delay);
        return transition($el, {
            transform: [transform + ' scale(0.5)',
                transform + ' scale(1)']
        }, duration, _delay, 'bounce-in');
    }
    else if (effect === 'descend') {
        const rules = { opacity: [0, 1], transform: ['translateY(-50%)', 'none'] };
        return transition($el, rules, duration, _delay);
    }
    else if (effect.startsWith('draw')) {
        const l = $el.strokeLength;
        $el.css({ opacity: 1, 'stroke-dasharray': l + 'px' });
        // Note that Safari can't handle negative dash offsets!
        const end = (effect === 'draw-reverse') ? 2 * l + 'px' : 0;
        const rules = { 'stroke-dashoffset': [l + 'px', end] };
        const animation = transition($el, rules, duration, _delay, 'linear');
        animation.promise.then(() => $el.css('stroke-dasharray', ''));
        return animation;
    }
    else if (effect.startsWith('slide')) {
        const rules = { opacity: [0, 1], transform: ['translateY(50px)', 'none'] };
        if (effect.includes('down'))
            rules.transform[0] = 'translateY(-50px)';
        if (effect.includes('right'))
            rules.transform[0] = 'translateX(-50px)';
        if (effect.includes('left'))
            rules.transform[0] = 'translateX(50px)';
        return transition($el, rules, duration, _delay);
    }
    else if (effect.startsWith('reveal')) {
        const rules = { opacity: [0, 1], height: [0, 'auto'] };
        if (effect.includes('left'))
            rules.transform = ['translateX(-50%)', 'none'];
        if (effect.includes('right'))
            rules.transform = ['translateX(50%)', 'none'];
        return transition($el, rules, duration, _delay);
    }
    return ResolvedAnimation;
}
function exit($el, effect = 'fade', duration = 400, delay = 0, remove = false) {
    if (!$el._el)
        return ResolvedAnimation;
    if (!isReady) {
        $el.hide();
        return ResolvedAnimation;
    }
    if ($el.css('display') === 'none')
        return ResolvedAnimation;
    let animation;
    if (effect === 'fade') {
        animation = transition($el, { opacity: [1, 0] }, duration, delay);
    }
    else if (effect === 'pop') {
        const transform = $el.transform.replace(/scale\([0-9.]*\)/, '');
        transition($el, { opacity: [1, 0] }, duration, delay);
        animation = transition($el, {
            transform: [transform + ' scale(1)',
                transform + ' scale(0.5)']
        }, duration, delay, 'bounce-out');
    }
    else if (effect === 'ascend') {
        const rules = { opacity: [1, 0], transform: ['none', 'translateY(-50%)'] };
        animation = transition($el, rules, duration, delay);
    }
    else if (effect.startsWith('draw')) {
        const l = $el.strokeLength;
        $el.css('stroke-dasharray', l);
        const start = (effect === 'draw-reverse') ? 2 * l + 'px' : 0;
        const rules = { 'stroke-dashoffset': [start, l + 'px'] };
        animation = transition($el, rules, duration, delay, 'linear');
    }
    else if (effect.startsWith('slide')) {
        const rules = { opacity: 0, transform: 'translateY(50px)' };
        if (effect.includes('up'))
            rules.transform = 'translateY(-50px)';
        animation = transition($el, rules, duration, delay);
    }
    else if (effect.startsWith('reveal')) {
        const rules = { opacity: 0, height: 0 };
        if (effect.includes('left'))
            rules.transform = 'translateX(-50%)';
        if (effect.includes('right'))
            rules.transform = 'translateX(50%)';
        animation = transition($el, rules, duration, delay);
    }
    animation.promise.then(() => remove ? $el.remove() : $el.hide());
    return animation;
}

// =============================================================================
/**
 * A draggable HTML element.
 * @emits {void} Draggable#start when the user starts dragging this element.
 * @emits {Point} Draggable#drag while the user is dragging this element.
 * @emits {void} Draggable#click when the user clicks on the this element.
 * @emits {void} Draggable#end after the user stops dragging this element.
 * @emits {Point} Draggable#move When the position of this element changes.
 */
class Draggable extends EventTarget {
    constructor($el, $parent, options = {}) {
        super();
        this.$el = $el;
        this.position = new Point(0, 0);
        this.disabled = false;
        this.width = 0;
        this.height = 0;
        this.options = applyDefaults(options, { moveX: true, moveY: true });
        this.setDimensions($parent);
        let startPosn;
        slide($el, {
            start: () => {
                if (this.disabled)
                    return;
                startPosn = this.position;
                this.trigger('start');
            },
            move: (posn, start) => {
                if (this.disabled)
                    return;
                this.setPosition(startPosn.x + posn.x - start.x, startPosn.y + posn.y - start.y);
                this.trigger('drag', this.position);
            },
            end: (last, start) => {
                if (this.disabled)
                    return;
                this.trigger(last.equals(start) ? 'click' : 'end');
            }
        });
        exports.Browser.onResize(() => {
            const oldWidth = this.width;
            const oldHeight = this.height;
            this.setDimensions($parent);
            this.setPosition(this.position.x * this.width / oldWidth || 0, this.position.y * this.height / oldHeight || 0);
        });
    }
    setDimensions($parent) {
        if ($parent.type === 'svg') {
            this.width = this.options.width || $parent.svgWidth;
            this.height = this.options.height || $parent.svgHeight;
        }
        else {
            this.width = this.options.width || $parent.width;
            this.height = this.options.height || $parent.height;
        }
    }
    /** Sets the position of the element. */
    setPosition(x, y) {
        const m = this.options.margin || 0;
        let p = new Point(this.options.moveX ? x : 0, this.options.moveY ? y : 0)
            .clamp(m, this.width - m, m, this.height - m)
            .round(this.options.snap || 1);
        if (this.options.round)
            p = this.options.round(p);
        if (p.equals(this.position))
            return;
        this.position = p;
        if (this.options.useTransform) {
            this.$el.translate(p.x, p.y);
        }
        else {
            if (this.options.moveX)
                this.$el.css('left', p.x + 'px');
            if (this.options.moveY)
                this.$el.css('top', p.y + 'px');
        }
        this.trigger('move', p);
    }
}

// =============================================================================
function getViewParams(url, view) {
    const match = view.regex.exec(url);
    if (match) {
        match.shift();
        const params = {};
        for (const [i, p] of view.params.entries())
            params[p] = match[i];
        return params;
    }
    else {
        return undefined;
    }
}
function getTemplate(view, params, url) {
    return __awaiter(this, void 0, void 0, function* () {
        if (view.template) {
            if (typeof view.template === 'string')
                return view.template;
            return view.template(params);
        }
        // Append a query string to only load the body of the page, not the header.
        const str = yield fetch(url + (url.indexOf('?') >= 0 ? '&xhr=1' : '?xhr=1'));
        return str.text();
    });
}
// Don't trigger Router events during the initial Page load.
let isReady$1 = (document.readyState === 'complete');
window.addEventListener('load', () => setTimeout(() => isReady$1 = true));
// Prevent scroll restoration on popstate
if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
}
// -----------------------------------------------------------------------------
// Router Cla
class Router extends EventTarget {
    constructor() {
        super(...arguments);
        this.$viewport = $body;
        this.views = [];
        this.active = { path: '', hash: '', index: 0 };
        this.search = window.location.search;
        this.preloaded = false;
        this.transition = false;
        this.noLoad = false;
        this.initialise = () => { };
    }
    setup(options = {}) {
        if (options.$viewport)
            this.$viewport = options.$viewport;
        if (options.initialise)
            options.initialise = this.initialise;
        if (options.preloaded)
            this.preloaded = options.preloaded;
        if (options.transition)
            this.transition = options.transition;
        if (options.noLoad)
            this.noLoad = options.noLoad;
        if (options.click) {
            $body.on('click', (e) => this.onLinkClick(e));
        }
        if (options.history) {
            window.addEventListener('popstate', (e) => {
                if (isReady$1 && e.state)
                    this.goToState(e.state);
            });
        }
    }
    view(url, { enter, exit, template } = {}) {
        // TODO Error on multiple matching views
        const params = (url.match(/:\w+/g) || []).map(x => x.substr(1));
        const regexStr = url.replace(/:\w+/g, '([\\w-]+)').replace('/', '\\/') +
            '\\/?';
        const searchStr = url.includes('?') ? '' : '(\\?.*)?';
        const regex = new RegExp('^' + regexStr + searchStr + '$', 'i');
        const thisView = { regex, params, enter, exit, template };
        this.views.push(thisView);
        const viewParams = getViewParams(window.location.pathname, thisView);
        if (!viewParams)
            return;
        this.active = {
            path: window.location.pathname + this.search,
            hash: window.location.hash,
            index: 0
        };
        window.history.replaceState(this.active, '', this.active.path + this.active.hash);
        // The wrappers fix stupid Firefox, which doesn't seem to take its time
        // triggering .createdCallbacks for web components...
        exports.Browser.ready(() => {
            setTimeout(() => {
                if (this.preloaded) {
                    this.initialise(this.$viewport, viewParams);
                    if (thisView.enter)
                        thisView.enter(this.$viewport, viewParams);
                }
                else {
                    this.loadView(thisView, viewParams, window.location.pathname);
                }
            });
        });
    }
    paths(...urls) {
        for (const url of urls)
            this.view(url);
    }
    getView(path) {
        for (const view of this.views) {
            const params = getViewParams(path, view);
            if (params)
                return { view, params };
        }
    }
    // ---------------------------------------------------------------------------
    // Loading and Rendering
    load(path, hash = '') {
        const go = this.getView(path);
        if (path === this.active.path && hash !== this.active.hash) {
            console.info('[boost] Routing to ' + path + hash);
            this.trigger('hashChange', hash.slice(1));
            this.trigger('change', path + hash);
            return true;
        }
        else if (go && path !== this.active.path) {
            console.info('[boost] Routing to ' + path + hash);
            this.trigger('change', path + hash);
            if (window.ga)
                window.ga('send', 'pageview', path + hash);
            if (this.noLoad) {
                if (go.view.enter)
                    go.view.enter(this.$viewport, go.params);
            }
            else {
                this.loadView(go.view, go.params, path);
            }
            return true;
        }
        else {
            return false;
        }
    }
    loadView(view, params = {}, url = '') {
        return __awaiter(this, void 0, void 0, function* () {
            this.$viewport.css({ opacity: 0.4, 'pointer-events': 'none' });
            const template = yield getTemplate(view, params, url);
            this.$viewport.css('opacity', 0);
            setTimeout(() => {
                this.$viewport.removeChildren();
                // TODO Remove all event listeners in $viewport, to avoid memory leaks.
                $body.scrollTop = 0;
                this.$viewport.html = template;
                exports.Browser.resize();
                replaceSvgImports();
                this.$viewport.css({ opacity: 1, 'pointer-events': 'all' });
                const $title = this.$viewport.$('title');
                if ($title)
                    document.title = $title.text;
                this.initialise(this.$viewport, params);
                if (view.enter)
                    view.enter(this.$viewport, params);
                this.trigger('afterChange', { $viewport: this.$viewport });
            }, 350);
        });
    }
    // ---------------------------------------------------------------------------
    // Navigation Functions
    onLinkClick(e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey)
            return;
        if (e.defaultPrevented)
            return;
        let el = e.target;
        while (el && el.nodeName !== 'A')
            el = el.parentNode;
        if (!el || el.nodeName !== 'A')
            return;
        const anchor = el;
        // Check target
        if (anchor.target)
            return;
        // Different origin
        if (anchor.origin !== window.location.origin)
            return;
        // Ignore if tag has "download" attribute or rel="external" attribute
        if (anchor.hasAttribute('download') || anchor.getAttribute('rel') ===
            'external')
            return;
        // Check for mailto: in the href
        const link = anchor.getAttribute('href');
        if (link && link.indexOf('mailto:') > -1)
            return;
        const success = this.goTo(anchor.pathname + anchor.search, anchor.hash);
        if (success)
            e.preventDefault();
    }
    goToState(state) {
        if (!state || !state.path)
            return;
        const change = this.load(state.path + this.search, state.hash);
        if (change && state.index < this.active.index)
            this.trigger('back');
        if (change && state.index > this.active.index)
            this.trigger('forward');
        this.active = state;
    }
    goTo(path, hash = '') {
        const success = this.load(path, hash);
        if (success) {
            const index = (this.active ? this.active.index + 1 : 0);
            this.active = { path, hash, index };
            window.history.pushState(this.active, '', path + hash);
        }
        return success;
    }
    back() { window.history.back(); }
    forward() { window.history.forward(); }
}
const RouterInstance = new Router();

// =============================================================================
/**
 * Converts a function into a WebWorker URL object that can be passed into
 * thread(). Note that `fn` has to be a single function with no external
 * references or bindings, so that it can be stringified using .toString().
 */
function functionToWorker(fn) {
    const content = `onmessage = e => postMessage((${fn.toString()})(e.data))`;
    const blob = new Blob([content], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}
/**
 * Creates a new web worker, posts it a serializable data object, and returns
 * when the worker responds (or after a fixed timeout).
 */
function thread(url, data, timeout = 5000) {
    const deferred = defer();
    const worker = new Worker(url);
    const t = setTimeout(() => {
        worker.terminate();
        console.error('WebWorker timeout!');
        deferred.reject();
    }, timeout);
    worker.onmessage = (e) => {
        clearTimeout(t);
        worker.terminate();
        console.log(e);
        deferred.resolve(e.data);
    };
    worker.onerror = (e) => {
        clearTimeout(t);
        console.error('WebWorker error!', e);
        worker.terminate();
        deferred.reject(e);
    };
    worker.postMessage(data);
    return deferred.promise;
}

// =============================================================================
// -----------------------------------------------------------------------------
// Utility Functions
function applyTemplate(el, options) {
    // Array.from() is required to break the reference to the original parent.
    const children = Array.from(el.childNodes);
    if (options.template) {
        el.innerHTML = options.template;
    }
    else if (options.templateId) {
        const template = document.querySelector(options.templateId);
        if (!template)
            throw new Error(`Template not found: ${options.templateId}`);
        while (el.firstChild)
            el.removeChild(el.firstChild);
        const content = template.content;
        const clone = document.importNode(content, true);
        el.appendChild(clone);
    }
    if (!children.length)
        return;
    const defaultSlot = el.querySelector('slot:not([name])');
    for (const child of children) {
        const name = child.getAttribute ? child.getAttribute('slot') : undefined;
        const slot = name ? el.querySelector(`slot[name="${name}"]`) : defaultSlot;
        if (slot)
            slot.parentNode.insertBefore(child, slot);
    }
    for (const slot of Array.from(el.querySelectorAll('slot'))) {
        slot.parentNode.removeChild(slot);
    }
}
function customElementChildren(el) {
    const result = [];
    for (const c of Array.from(el.children)) {
        if (c.tagName.startsWith('X-')) {
            result.push(c);
        }
        else {
            result.push(...customElementChildren(c));
        }
    }
    return result;
}
// -----------------------------------------------------------------------------
// Custom Element Classes
const customElementOptions = new Map();
class CustomHTMLElement extends HTMLElement {
    constructor() {
        super(...arguments);
        this.wasConnected = false;
        this.isReady = false;
    }
    connectedCallback() {
        return __awaiter(this, void 0, void 0, function* () {
            // The element setup is done when it is first attached to the dom. We have
            // to guard against this running more than once.
            if (this.wasConnected) {
                // TODO Bind the model of the new parent.
                this._view.trigger('connected');
                return;
            }
            this.wasConnected = true;
            this.isReady = false;
            this._view.created();
            const options = customElementOptions.get(this._view.tagName) || {};
            // Bind Component Template
            if (options.template || options.templateId)
                applyTemplate(this, options);
            // Select all unresolved custom element children
            // TODO improve performance and fix ordering
            const promises = customElementChildren(this)
                .filter(c => !c.isReady)
                .map(c => new Promise(res => c.addEventListener('ready', res)));
            yield Promise.all(promises);
            this._view.ready();
            this.dispatchEvent(new CustomEvent('ready'));
            this.isReady = true;
        });
    }
    disconnectedCallback() {
        this._view.trigger('disconnected');
    }
    attributeChangedCallback(attrName, oldVal, newVal) {
        this._view.trigger('attr:' + attrName, { newVal, oldVal });
    }
}
/**
 * Base class for custom HTML elements. In addition to other custom methods,
 * it can implement `created()` and `ready()` methods that are executed during
 * the element lifecycle.
 */
class CustomElementView extends HTMLBaseView {
    created() { }
    ready() { }
}
/**
 * Decorator for registering a new custom HTML element.
 */
function register(tagName, options = {}) {
    return function (ElementClass) {
        // Every class can only be used once as custom element,
        // so we have to make a copy.
        class Constructor extends CustomHTMLElement {
            constructor() {
                super();
                this._view = new ElementClass(this);
            }
        }
        Constructor.observedAttributes = options.attributes || [];
        customElementOptions.set(tagName.toUpperCase(), options);
        window.customElements.define(tagName, Constructor);
    };
}

exports.$ = $;
exports.$$ = $$;
exports.$N = $N;
exports.$body = $body;
exports.$html = $html;
exports.BaseView = BaseView;
exports.CanvasView = CanvasView;
exports.CustomElementView = CustomElementView;
exports.Draggable = Draggable;
exports.FormView = FormView;
exports.HTMLBaseView = HTMLBaseView;
exports.InputView = InputView;
exports.KEY_CODES = KEY_CODES;
exports.MediaView = MediaView;
exports.ResolvedAnimation = ResolvedAnimation;
exports.Router = RouterInstance;
exports.SVGBaseView = SVGBaseView;
exports.SVGParentView = SVGParentView;
exports.WindowView = WindowView;
exports.angleSize = angleSize;
exports.animate = animate;
exports.bindEvent = bindEvent;
exports.bindObservable = bindObservable;
exports.canvasPointerPosition = canvasPointerPosition;
exports.deferredPost = deferredPost;
exports.drawSVG = drawSVG;
exports.ease = ease;
exports.enter = enter;
exports.exit = exit;
exports.fromQueryString = fromQueryString;
exports.functionToWorker = functionToWorker;
exports.getEventTarget = getEventTarget;
exports.hover = hover;
exports.loadImage = loadImage;
exports.loadScript = loadScript;
exports.observable = observable;
exports.parse = parse;
exports.pointerPosition = pointerPosition;
exports.post = post;
exports.register = register;
exports.replaceSvgImports = replaceSvgImports;
exports.slide = slide;
exports.svgPointerPosn = svgPointerPosn;
exports.thread = thread;
exports.toQueryString = toQueryString;
exports.transition = transition;
exports.unbindEvent = unbindEvent;
