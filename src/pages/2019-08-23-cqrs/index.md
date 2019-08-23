---
title: 'CQRS: Write Model VS Read Model'
description: ''
date: '2019-08-23T12:00Z'
is_blog: false
path: '/articles/2019/08/23/cqrs/'
language: 'en'
tags: ['cqrs', 'event sourcing', 'kafka', 'architecture']
category: 'Data Engineering'
background: ''
---

TOC

Never read write model
- Internal
- No coupling
- Scalability different of reads

If we want to ensure we read the latest data
- why?
- business rules?
- wrong domain separation?
- need Command, maybe sagas?

Or maybe an ACL to expose the write model as a "read"
 But still: scalability !

 Transform internal to external events. ACL.

 Query model with a blocking "entity_id/v3" until it's up to date, or timeout


 ((Talk about outbox pattern? ?? I don't think so)


# How to