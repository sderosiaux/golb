Create 3 microservices A -> B -> C without any kind of control, just basic HTTP with a standard HTTP client call Make B or C crash.
-> what happens ?
-> what is the error in the frontend? (crap 500)

Run another B, run another C (redundancy, load balancing, master/backup (they can act like backup, inactive the whole time except when the first C fail, B has to implement some kind of logic..), same for multiple B, and multiple A !

-> Sometimes, it's not enough.

Let's say C is just slow because it timeouts trying to access an external resource : the whole stack become slow (and crash at the end): the system is overloaded for no reason.
