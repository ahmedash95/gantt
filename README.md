# Gantt
A simple, interactive, modern gantt chart library for the web

![image](https://cloud.githubusercontent.com/assets/9355208/19997551/5bc597f2-a28d-11e6-809a-4cfa5fdf96d2.png)

####View the demo [here](https://frappe.github.io/gantt).

###Usage
Include it in your html:
```
<script src="moment.min.js"></script>
<script src="snap.svg-min.js"></script>
<script src="frappe-gantt.min.js"></script>
<link href="frappe-gantt.css"></script>
```

And start hacking:
```
var gantt = new Gantt({
  parent_selector: "#gantt",
  tasks: [
    {
      start: "2016-10-04",
      end: "2016-10-10",
      name: "Explore ERPNext",
      id: 0,
      progress: 30
    },
    ...
  ],
  date_format: "YYYY-MM-DD"
});
gantt.render();
```

If you want to contribute:

1. Clone this repo.
2. `cd` into project directory
3. `npm install`
4. `grunt`


------------------
Project maintained by [frappe](https://github.com/frappe)
