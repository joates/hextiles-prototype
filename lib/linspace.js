/*
 * linspace function:
 * https://github.com/sloisel/numeric/blob/master/src/numeric.js#L922 
 *
 * Numeric Javascript is copyright by Sébastien Loisel and is distributed under the MIT license.
 *
 * Numeric Javascript
 * Copyright (C) 2011 by Sébastien Loisel
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

module.exports = function(a,b,n) {
  if(typeof n === "undefined") n = Math.max(Math.round(b-a)+1,1)
  if(n<2) { return n===1?[a]:[] }
  var i,ret = Array(n)
  n--
  for(i=n;i>=0;i--) { ret[i] = (i*b+(n-i)*a)/n }
  return ret
}

