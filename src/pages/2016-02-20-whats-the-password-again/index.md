---
title: "How to not remember any password ?"
date: "2016-02-20T20:23:05Z"
is_blog: true
path: "/articles/2016/02/20/whats-the-password-again/"
language: en
---

In our company or home network, we have access to several computers. We probably want to interact with some of them, start some tasks, check some logs, reboot them and so on.

Of course, we are already using ssh to do so. But, if you are still typing a username and password each time you log in somewhere, please stop.

---
Summary {.summary}

[[toc]]

---

# Passwords are obsolete

We should stop losing our time, by looking at some excel to get the password or such, and use the power of the public-key cryptography. Smart people created that for a reason.

The principle is simple : 

- We have a (private) key in a file on our computer.
- The other computer has our (public) key in a file.
- Those keys are strongly related.

When we are going to connect to the other computer, both `ssh` and `sshd` (the daemon waiting for connections) will talk to each other and will check if they can make talk to each other using the keys each of them have. If they succeed, it means we are the one with the good private key (only our computer stores it, nothing else), we are how we claim to be, and therefore we have access. 

# Keys can be used with GitHub, BitBucket, anything

This keys approach does not only apply to the networks where we ssh.

It applies to the whole Internet, such as GitHub, BitBucket, or anything that has a login and password.

We are not doing pure `ssh` command-line with them but we are pushing data into them. Data that need to be authenticated.

That's why they offer the possibility to add some public keys for our account (through their UI) that will work in pair with the private key we have stored on our local computer. 

# Time to do some hacking

## Here is my key

First, we need to generate those keys on our local computer : 
    
```xml
# ssh-keygen -t rsa
Generating public/private rsa key pair.
Enter file in which to save the key (/root/.ssh/id_rsa):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /root/.ssh/id_rsa.
Your public key has been saved in /root/.ssh/id_rsa.pub.
```

By default, we won't put any passphrase, even if that can be considered as a bad practice.

That will generate a **private** key in `/root/.ssh/id_rsa`: 
    
```xml
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA/gV3aLUTDenLFw7hkkfNcJT4pbnt7gQVcjga4Rik4+hIU6a6
...
-----END RSA PRIVATE KEY-----
```     

We must never share this, never ever.

Its related **public** key is in `/root/.ssh/id_rsa.pub`: 
    
```xml
ssh-rsa AAAAB3NzaC1yc2EAAAADA...slxyu9Ki8Hn6jWR root@computer
```

The keys are related to our user and hostname.

We are going to copy that line to any server we want to access.
It will use the `user@hostname` to find out if it has a public key for us.

It's popular to add some options to `ssh-keygen`, to generate a stronger key and set explicitly the user name in `id_rsa.pub` such as: 
    
```xml
$ ssh-keygen -t rsa -b 4096 -C "email@example.com"
```

## It's dangerous to go alone, take this

Now, we are going to copy our public key to the server.

We will be able to identify ourself to the server and get the access.

The default path used by `sshd` is `.ssh/authorized_keys` in the home folder of the user we want to connect: 
    
```xml   
root@local:~# ssh john@server
```

The path on the server would be: `/home/john/.ssh/authorized_keys`.

We can create it manually if it doesn't exist yet.

Its content is quite simple, one line per public key (several users could connect as john on the server) : 
    
```
$ cat .ssh/authorized_keys
ssh-rsa AAAAB3NzaC1yc2EAAAADA...slxyu9Ki8Hn6jWR root@computer
ssh-rsa 2cvUZEP4ZuMtElv/Iu6M6...w8Qoa4A3b8a+YNl trainee@macos
```

As soon as we save the file, we'll be able to connect from our local computer on the server, no question asked. 
    
```xml
root@local:~# ssh john@server
john@server:~$
```

# One-way only

This configuration is a *one-way only*.

We can't connect from the server to the local, we need the reverse association.

If we want that, we must perform the same actions but from the other side (generate keys on the server and add the public key to our local computer).

But that's considered a bad practice: a user on a server should never be able to connect to another computer. We should always exit to our local computer, then connect to the other server. We should not connect nodes between them, it can introduce security issues. 

# Never reset the public key

Once we put our public key somewhere, we should never generate again our keys on our computer.

Otherwise we'll lose the public/private keys association and thus, the ability to connect to the servers we set up.
The public key on the servers won't "match" anymore our local private key.

Hopefully, `ssh-keygen` will warn us if that's the case. 

# .ssh/config

## The username is optional

Another great feature is to avoid typing the username we want to login with on the server.

Instead of : 
    
```xml
root@local:~# ssh john@staging
```

We'd like to do: 
    
```xml
root@local:~# ssh staging
```

While having automatically *john* as username on the server.

To do so, we can edit the file `.ssh/config` and add something like : 
    
```xml
Host staging
    HostName staging.host.lan
    User john
```

We can add as many hosts as we want in this file: it's simply a list of mappings.

## Generic ssh option

`.ssh/config` is not only useful to declare Host mappings.

It can contain way more configuration bits, such as : 
   
```
Host *
    ServerAliveInterval 60
```

This can avoid us the famous *broken pipe* we'll get if we are inactive in a ssh session.

That will send keep alive packets to be sure the connection stays up. 

# Copy files using ssh

The keys are not only used by `ssh`.

`scp` is also compatible (used to copy files from/to another host): 
   
```xml
$ scp -r staging:/tmp/logs .
```

It follows the same rule as `ssh`: using `.ssh/config` and the set of keys on both sides. 

# For a better security

For a better security, our keys should have a passphrase (that we set to blank in our example).

We should also use `ssh-agent` to avoid typing it when needed.