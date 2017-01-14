---
title: "Comparing Blog Hosting Services—For developers"
date: "2017-01-09T22:54:22Z"
layout: post
path: "/2017/01/09/comparing-blog-hosting-services-for-developers/"
language: "en"
---

This blog was using Wordpress hosted on OVH for a long time. I'm sorry.

The code was kinda bloated, was using a lot of scripts, the platform was not especially fast. But at least, Wordpress was providing a lot of already in place features for SEO, feeds, and some cache optimizations, and easy plugins integrations.

Nevermind the advantages, I wanted to remove it since a while, to switch to a pure static website: I don't need a database or a all-in-one platform just to control my blog. It's just some texts and images ffs. Moreover, I wanted to customize what I wanted myself. I am a front-end and back-end engineer, I don't need third-party plugins that does half the thing I want.

At the end, Wordpress brought me more issues than expected. I've tuned the source so much that I stopped updating the platform in fear to lose something. Most plugins were out of dates. PHP was out of date. Wordpress version was out of date, but I still had to update for the security releases. The editor was crappy and sometimes buggy (I had to refresh the full thing). It was not all in markdown. I was doing regular backups myself in case it would collapsed. The versioning was for the posts only, and intra-wordpress. Some changes to the platform were directly available on the Internet, what if I wanted to test it first, see the delta (not talking about the posts that can be drafted)? The list goes on. Anyway, I'm sure it was possible to tune everything as I wanted with some plugins, but I didn't had the time to explore, and I just didn't want. It was too much.

Do you recognize yourself ?

After a while, I did some brain-storming with myself, and settle on what to do.
Here are the things to consider for a blog website and some platforms I evaluated.

Spoiler: I switched to Gatsby and Netlify.

---
Summary {.summary}

[[toc]]

---

# Desired features

The first thing to do is to decide what feature do we want. Here are what I consider must-haves for a blog website.

## Static only: Gatsby

As I said in the introduction, a blog is just a bunch of texts, images, and links all over the place.

A blog should leverage that by not doing any database access or any API calls, and not depending on server-side language like PHP or ASP.NET. Its only backend should be a HTTP server (and accelerator) specially configured to serve static content (to rely on cache optimization).

A blog is not dynamic by nature, except for the comments.

It's possible to write a blog with only `.html` but it's a bit too low-level. A good option is to generate a static website from some source not written in HTML, and have some knobs to alter the generation.

Personally, I pick [Gatsby](https://github.com/gatsbyjs/gatsby) because it was popular, well alive, configurable, ReactJS powered, and had several blog examples to refer to.

## A custom domain

This one is not mandatory, but appreciable. We rarely want our blog to contain the name of the platform that hosts it.
Moreover, having a custom domain allows us to change the platform behind (exactly as I did). It's almost a no-brain.

Domains are quite cheap, from 2.50€ to >20€, we can at least spend that much for a personal hostname on the Internet.

## Versioning using git

Wordpress has a post versioning system, but it's internal to Wordpress and only handles the posts, not the global options of the Blog itself.

The _de facto_ way of writing blog posts is to commit them into a git repository where we can commit, push things, create branches for drafts, and merge at the end. GitHub is an obvious choice where to set our Blog code source.

## Markdown

As we said, the best solution is to generate HTML from some source.

It exists numerous way of writing a source convertible to HTML:

- HTML itself
- txt
- LaTeX
- Markdown
- JSX (ReactJS)

Markdown is the preferred way to write things because it's easy and quite standard (Github flavored).
This flavor allows us to write any language using the triple quotes ` ```js ` for the context to be properly syntax highlighted when converted to HTML.

## Front-end framework

A blog is the facade we present to the world. When we say we are a front-end engineer, we must ensure we are not exposing too much crap in the code of our blog.

It's the occasion to organize the scripts, reduce the payload, and show that we know ReactJS, Angular2, CycleJS, VueJS, ELM, or ScalaJS when one inspect the source.

## Speed / CDN

A blog should be ultra-fast to be rendered. No compromise.

As we said, it only deals with static content, therefore it should rely on cache techniques and CDN.
I think it's very important for a blog to be speed as light, otherwise the user can easily cancel and go back to Google.

## Testing locally

A feature I truly lack of with Wordpress is the ability to change something on the blog, and test it. Having a second Wordpress platform to test was a no-go.

As any application, even a Blog needs a *staging* environment where you can test things on the Blog itself, or see some drafts. A Blog is not a technical paper settled in stone, we like to make it evolve, to adapt it to the users, to the web, to the SEO. _And we should never test in production_.

## HTTPS

This is clearly a must. It's useful for SEO purpose, [Google (and every search engines probably) favors HTTPS](https://webmasters.googleblog.com/2014/08/https-as-ranking-signal.html).

With [Letsencrypt](https://letsencrypt.org/) it's free, and it's often already integrated in the hosting service now, there is no reason to not have one.

## Comments

The comments is the only dynamic part of a blog.

[disqus](https://disqus.com/) is so easy to put in place (and is so common), that it's almost a no-brain.

The only downside is that the Blog does not own its own comments, but a third-party does. The page url is generally the identifier to retrieve them, but it can be tricky when a Blog migration occurs and its urls change. At least, thanks to this, we don't need to host a database.

## Continuous-Delivery

As we said, we'd like to type our posts in Markdown and commit them into GitHub.

Then we'd like some hooks and a Continuous Integration system to build the static part of the blog afterwards, without running it ourself.

This way, even if we are not on our computer, we can go to GitHub, edit a file there (like, fix a typo), commit it, and see our update a few seconds later live.

It's the purpose of platforms like [TravisCI](https://travis-ci.org/) or [CircleCI](https://circleci.com/). We can tell them what to do after a commit occurs on any of our repository.

## Cost

Last but not least, the cost.

The cheaper the better.

The best is be to pay only the custom domain name, and not any hosting service.

## Conclusion

We almost described what a classic website should deal with, just a bit more oriented Blog!

We want to automatically generate a fast, customizable, and secured static website from some markdown sources commited on a git repository.



# Blog Hosting Services for developers

Here are some _Blog hosting services_ to consider, for developers only.

## GitHub

There are several ways to use GitHub as a Blog hosting service.

### Pure

The simplest way is like writing a `README.md`. You just have to organize the content and present a blog index. Done.

A good example is this repository: https://github.com/shekhargulati/52-technologies-in-2016

Obviously, that does not answer all our needs but as a quick and dirty way (and _starry_ way), it exists.

### gh-pages

In any repository, GitHub allows us to generate the `gh-pages` branch to get a public website based on the README. Then, we can alter the `gh-pages` branch as any branch, our website will automatically change, all for free.

It's VERY used. The address look like: `https://[account].github.io/[project]`.

That provides everything we want, HTTPS on the github.io domain or on a [custom domain](https://help.github.com/articles/using-a-custom-domain-with-github-pages/), it's fast, it provides Continuous-Delivery (because we modify the source itself!).

We just have to integrate a build process to convert our markdown sources (that would stay on `master` for instance) to HTML and commit them to `gh-pages`.

### Issues

A interesting trick is to use the GitHub issues as Post and Comments.

For instance, https://github.com/casualjavascript/blog

This technique uses the GitHub API on the fly to add the posts in the generated website. Quite clever to be mention here, even if that does not respect our constraints.

## Amazon S3

S3 is a very good choice to host a static blog (or website in general).
It's incredibly reliable, ultra fast, resilient, and hundred other positive adjectives.
Moreover, it's easy to plug the blog to a Amazon CDN afterwards ([Cloudfront](https://aws.amazon.com/cloudfront/)) for maximum performances.

The only "downside" is that you're probably going to pay a few bucks after the first year (mostly free) for the traffic and the storage—but for a blog, it's nothing.

A quick overview of how to do it:

- We create a S3 bucket then we upload our files into.
- We enable Amazon Static Website Hosting on this bucket.
- To handle the custom domain, as usual, we set the CNAME to s3.amazonaws.com or we set the A record.

More explanations with screenshots [here](https://davidwalsh.name/hosting-website-amazon-s3) and [over there](https://blog.hartleybrody.com/static-site-s3/).

For the automation, it's possible to automatically sync the bucket with `s3cmd sync` for instance, but I'm sure it exists some websites to do it automatically.

For HTTPS, it's pretty sure we need to use the [Certificate Manager](https://aws.amazon.com/certificate-manager/) of Amazon, plugged with some Route53. I don't have any experience with that, I let you decide.

Anyway, some knowledge of Amazon WS ecosystem is required to get a smooth experience.

## Surge

[Surge](https://surge.sh/) provides a wonderful Developer Experience.
It's free, simple, powerful, and has a great documentation.
We don't need to spend your time configuring anything, expect create an account in the CLI itself.

As they say:

```xml
$ npm install --global surge
$ surge public/ https://www.chteu.com
...
  Success! Project is published and running at www.chteu.com
```

Directly, our website is available to everyone, behind a CDN moreover. 

We still need to configure the custom domain (CNAME or A) and organize some automation to automatically call `surge` on our build.

Personally, I had issues with the HTTPS certificate. It was generated by `surge`, not on my custom domain, but still on `*.surge.sh`. This was causing a certificate error in the browser. I'm pretty sure I messed up somewhere or I didn't wait enough for the change to propagate, I'm not sure (or should I have been a paying user to customize something? I don't think so). I couldn't fixed it, so I kept looking.

## Now

[now](https://zeit.co/now) is part of the collection of tools [zeit](https://zeit.co/) provides.

It's a bit like the surge CLI, you just type `now` in a folder, and it's deployed somewhere online using HTTPS and HTTP/2.
It can deploy nodejs projects (ie: with a server), Docker projects, or simple static websites.

```
$ now
> Deploying C:\blog\public
> Warning! Skipping file C:\blog\public\bundle.js (size exceeded 1MB)
> Warning! Skipping file C:\blog\public\bundle.js.map (size exceeded 1MB)
> Warning! 2 of the files exceeded the limit for your plan.
> See https://zeit.co/account to upgrade.
> Using Node.js 7.0.0 (default)
> Ready! https://public-zqmwawsonc.now.sh (copied to clipboard) [2s]
> Upload [====================] 100% 0.0s
> Sync complete (2.35MB) [14s]
> Initializing…
> Building
> ▲ npm install
> Installing package serve@latest
> ▲ npm start
> Deployment complete!
```

Two things to consider:
- The free plan does not allow to upload file bigger than 1MB (a JavaScript bundle can easily achieve that).
- To use a custom domain, we need to upgrade our account and pay $15/mo.

## Netlify :star:

[Netlify](https://www.netlify.com/) is a platform that is directly plugged into some git repositories.
Thanks to this, it registers some hooks and is notified when the repository is updated.
It also has a CLI like Surge, `netlify-cli`, but it's not mandatory to install it, we can register the repository on their website.

> I only publish the `.md` to my repository, not the static website build itself, how does it work?

The answer is that Netlify *BUILDS* the static website from the sources and publish the `public/` folder itself! It's like.. Yes, amazing. Just with that, it offers the best DX possible. We commit a `.md`, one minute later, we see our public blog updated, nothing to worry about, Continous Deployment FTW. Thank you Netlify.

Netlify knows how to build the website because we tell him how to, and we tell him where is the generated content afterwards. Hopefully, Netlify is aware of the popular *static website generators* and can recognize if the repository is using one. It knows [Gatsby](https://github.com/gatsbyjs/gatsby) so its default configuration was already good for me.

As the other solutions, it's possible to link our Netlify application to a custom domain, and it can generate a valid HTTPS certificate.

I don't really see any downside.

# Conclusion

I think Gastby + Netlify is a very good choice to host a blog.

- Gastby is configurable, is React powered, generated a good static content, and has a great community.
- Netlify is just a perfect Continuous Deployment platform to not worry about anything once configured.
