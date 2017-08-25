Rx

3 pools:
- one for IO: EventLoopSchduyler : #cores fixed
- one for computation: CachedThreadScheduler: are ended on TTL (or not..)
- one mix: New ThreadScheduler

- pick the scheduler lthe observable should use
Observable[](..).subscribeOn(IOScheduler) => for Producer
Consumer: observeOn(...)



toBlocking.last
1) sinon le main meurt
2) #thread = #cores ou => evenbts loops scheduler (rx.scheduler.max_..threads)
3). publish() + connect() => hot!  . replay idem
