---
title: "JNA—Java Native Access: enjoy the native functions"
date: "2016-08-03T23:48:53Z"
is_blog: true
path: "/articles/2016/08/03/jna-java-native-access-enjoy-the-native-functions/"
language: "en"
---

Sometimes, it's necessary to know JNA to interact with system or third-party APIs, probably written in C/C++.

JNA provides a *bridge* to be able to call them from Java-Land.

---
Summary {.summary}

[[toc]]

---

# Before JNA: JNI

You've probably heard of JNI: [Java Native Interface](https://en.wikipedia.org/wiki/Java_Native_Interface).

It's used to call the native functions of the system or of any native library. Some good JNI explanations and examples at IBM's: <http://www.ibm.com/developerworks/java/tutorials/j-jni/j-jni.html>

Most of developers will never use it because it's not often necessary to access the system resources, the windows, the volumes etc. That really depends of our business.

Sometimes, we want to use a library that's not written in Java but in C. It's very performant and battle-tested, but you need to create a bridge.
This is where JNI and JNA come into play.

About resources, the JDK already provides some limited high-level API to monitor some system aspects: 

- `Runtime.getRuntime().maxMemory()`
- `Runtime.getRuntime().availableProcessors()`
- `File.listRoots()(0).getFreeSpace()`

Behind the scene, they are declared as native and rely on JNI.

We can use some projects that offer more options, such as [oshi (Operating System & Hardware Information)](https://github.com/dblock/oshi).

It exposes all possible information on the OS and hardware of the machine (all memory and cpu metrics, network, battery, usb, sensors..): it's not using JNI: it's using JNA!

[JNA](https://github.com/java-native-access/jna) is JNI's cousin: created to be simpler to use, and to write only Java code. (Scala in our case :)

Note that there is a slight call overhead compared to JNI because of the dynamic bindings. 

# JNA

JNA dynamically links the functions of the native library to some functions declared in a Java/Scala interface/trait.

The difficulty comes with the signature of the functions we want to *import*.

We can easily find their native signatures (Google is our friend), but it's not always obvious to find how to translate them using the Java/Scala types.

The documentation of JNA is pretty good to help with the subtle cases: [Using the library](https://github.com/java-native-access/jna#using-the-library), [FAQ](https://github.com/java-native-access/jna/blob/master/www/FrequentlyAskedQuestions.md).

Let's review how to use it using Scala and SBT (instead of Java). 

## How to use it

First, SBT:

```scala
libraryDependencies ++= Seq(
  "net.java.dev.jna" % "jna" % "4.2.2",
  "net.java.dev.jna" % "jna-platform" % "4.2.2")
```

The `jna` dependency is the core.

`jna-platform` is optional. It contains a lot of already written interfaces to access some standard libraries on several systems (Windows (kernel32, user32, COM..), Linux (X11), Mac).

## Using the existing platform bindings

With `jna-platform`, we can use the existing bindings to get the computer name for instance:

```scala
import com.sun.jna.platform.win32.Kernel32
import com.sun.jna.ptr.IntByReference

val cn = new Array[Char](256)
val success: Boolean = Kernel32.INSTANCE.GetComputerName(cn, new IntByReference(256))
println(if (success) Native.toString(cn) else Kernel32.INSTANCE.GetLastError())
```
We can feel the native way when calling this function (most native functions follows this style: passing an array by reference that will be filled): 

- We provide a buffer and its length.
- We get a boolean as result to indicate success/failure.
- In case of a failure, we call [GetLastError()](https://msdn.microsoft.com/en-us/library/windows/desktop/ms679360\(v=vs.85\).aspx) to know the code of the error (such as 111 for [ERROR_BUFFER_OVERFLOW](https://msdn.microsoft.com/en-us/library/windows/desktop/ms681382\(v=vs.85\).aspx))
- In case of a success, the buffer will contain the name.

For information, the native signature of `GetComputerName` is:

```c
BOOL WINAPI GetComputerName(_Out_ LPTSTR lpBuffer, _Inout_ LPDWORD lpnSize);
```

ie: a pointer to some buffer to write into and its size (use as input and as output). 

## Listing the opened windows

Another more complex example to retrieve the list of opened windows:

```scala
import com.sun.jna.platform.win32.{User32, WinUser}
 
User32.INSTANCE.EnumWindows(new WinUser.WNDENUMPROC {
  override def callback(hWnd: HWND, arg: Pointer): Boolean = {
    val buffer = new Array[Char](256)
    User32.INSTANCE.GetWindowText(hWnd, buffer, 256)
    println(s"$hWnd: ${Native.toString(buffer)}")
    true
  }
}, null)
```

Output:

```
native@0xb0274: JavaUpdate SysTray Icon 
native@0x10342: GDI+ Window 
native@0x10180: Windows Push Notifications Platform 
(a lot more)...
```

The native signature of EnumWindows is :

```c
BOOL WINAPI EnumWindows(
  _In_ WNDENUMPROC lpEnumFunc,
  _In_ LPARAM      lParam);
```

- We use `User32` because it contains the windows functions of Windows.
- A `WNDENUMPROC`  is a pointer to a callback. JNA already has an interface of the same name to be able to create this type in the JVM.
- We call another function of `User32` to get the title of each window.

# Create a custom binding

It's time to fly with our own wings.

Let's call a famous function of the Windows API: `MessageBox`.
It's in `User32.lib` but JNA did not implemented it: we'll do it ourself.

First, we create an interface with the Java/Scala signature of the [native function](https://msdn.microsoft.com/en-us/library/windows/desktop/ms645505\(v=vs.85\).aspx) which is:

```c
int WINAPI MessageBox(
  _In_opt_ HWND    hWnd,
  _In_opt_ LPCTSTR lpText,
  _In_opt_ LPCTSTR lpCaption,
  _In_     UINT    uType);
```

The Scala interface would be:

```scala
import com.sun.jna.Pointer
import com.sun.jna.win32.StdCallLibrary
 
trait MyUser32 extends StdCallLibrary {
  def MessageBox(hWnd: Pointer, lpText: String, lpCaption: String, uType: Int)
}
```

- We use simple `String`s and not `Array[Char]` because they are only used as inputs `_In_`.
- The name of the Scala function must be exactly the name of the native function (with caps)

Finally, we instantiate the interface with JNA and call our function:

```scala
val u32 = Native.loadLibrary("user32", classOf[MyUser32], W32APIOptions.UNICODE_OPTIONS)
                .asInstanceOf[MyUser32]
val MB_YESNO = 0x00000004
val MB_ICONEXCLAMATION = 0x00000030
u32.MessageBox(null, "Hello there!", "Hi", MB_YESNO | MB_ICONEXCLAMATION)
```

![](img_57a2799c95f45.png)

We should always use `W32APIOptions.UNICODE_OPTIONS` or we'll get some troubles when we call the functions.
This flag make the function to automatically converts the input/output of the calls.

# Conclusion

It was quite simple right? That's the purpose of JNA.

We just need an interface with the native method declaration, then we can call it.

The difficulty is to write the Java signatures. A tool can help: [JNAerator](http://github.com/nativelibs4java/JNAerator).
From the native language, it can generate Java signatures, pretty cool!

More examples of JNA usage on their GitHub's: <https://github.com/java-native-access/jna/tree/master/contrib>
