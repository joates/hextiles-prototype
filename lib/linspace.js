module.exports = function(a,b,n) {
  if(typeof n === "undefined") n = Math.max(Math.round(b-a)+1,1)
  if(n<2) { return n===1?[a]:[] }
  var i,ret = Array(n)
  n--
  for(i=n;i>=0;i--) { ret[i] = (i*b+(n-i)*a)/n }
  return ret
}

