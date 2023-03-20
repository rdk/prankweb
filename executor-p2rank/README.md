# About
This module wraps:
* [p2rank]
* conservation pipelines

# Changes to p2rank defaults
* P2rank does not support redirects of [stderr to custom file](https://github.com/rdk/p2rank/issues/39). 
  To tackle this issue we have custom scripts to run p2rank.
* Default P2rank memory is increased to 4GB.
 