/*
	Class: Bar

	Opts:
		canvas [reqd]
		task [reqd]
		unit_width [reqd]
		x
		y
*/

var Bar = Class.extend({
	init: function (opts) {
		for(var key in opts) {
			if(opts.hasOwnProperty(key))
				this[key] = opts[key];
		}
		this.set_defaults();
		this.prepare();
		this.draw();
		this.bind();
		this.action_completed = false;
	},
	set_defaults: function () {
		var defaults = {
			height: 20,
			corner_radius: 3,
			events: {}
		};
		for(var key in defaults) {
			if(defaults.hasOwnProperty(key))
				if(!this[key]) this[key] = defaults[key];
		}
	},
	prepare: function () {
		this.prepare_values();
		this.prepare_plugins();
	},
	prepare_values: function() {
		if(!this.task.start || !this.task.end){
			this.invalid = true;
		}
		this.x = this.compute_x();
		this.y = this.compute_y();
		this.duration = (this.task._end.diff(this.task._start, 'hours') + 24)/this.gantt.step;
		this.width = this.gantt.unit_width * this.duration;
		this.progress_width = this.gantt.unit_width * this.duration * (this.task.progress/100) || 0;
		this.group = this.canvas.group().addClass('bar-wrapper');
		this.bar_group = this.canvas.group().addClass('bar-group').appendTo(this.group);
		this.handle_group = this.canvas.group().addClass('handle-group').appendTo(this.group);
	},
	prepare_plugins: function() {
		this.filters = {};
		Snap.plugin(function (Snap, Element, Paper, global, Fragment) {
			Element.prototype.get = function (attr) {
				return +this.attr(attr);
			};
			Element.prototype.getX = function () {
				return this.get("x");
			};
			Element.prototype.getEndX = function () {
				return this.getX() + this.getWidth();
			};
			Element.prototype.getY = function () {
				return this.get("y");
			};
			Element.prototype.getWidth = function () {
				return this.get("width");
			};
		});
	},
	draw: function () {
		this.draw_bar();
		this.draw_progress_bar();
		this.draw_label();
		this.draw_resize_handles();
	},
	draw_bar: function() {
		this.$bar = this.canvas.rect(this.x, this.y,
			this.width, this.height,
			this.corner_radius, this.corner_radius)
			.addClass("bar")
			.appendTo(this.bar_group);
		if(this.invalid) {
			this.$bar.addClass('bar-invalid');
		}
	},
	draw_progress_bar: function() {
		if(this.invalid) return;
		this.$bar_progress = this.canvas.rect(this.x, this.y,
			this.progress_width, this.height,
			this.corner_radius, this.corner_radius)
			.addClass("bar-progress")
			.appendTo(this.bar_group);
	},
	draw_label: function() {
		this.canvas.text(this.x + this.width/2,
				this.y + this.height/2,
				this.task.name)
			.addClass("bar-label")
			.appendTo(this.bar_group);
		this.update_label_position();
	},
	draw_resize_handles: function() {
		if(this.invalid) return;
		var bar = this.$bar,
		bar_progress = this.$bar_progress;

		this.canvas.rect(bar.getX() + bar.getWidth() - 9, bar.getY() + 1,
			8, this.height - 2, this.corner_radius, this.corner_radius)
				.addClass('handle right')
				.appendTo(this.handle_group);
		this.canvas.rect(bar.getX() + 1, bar.getY() + 1,
			8, this.height - 2, this.corner_radius, this.corner_radius)
			.addClass('handle left')
			.appendTo(this.handle_group);

		if(this.task.progress && this.task.progress < 100) {
			this.canvas.polygon(
				bar_progress.getEndX() - 5, bar_progress.getY() + bar_progress.get("height"),
				bar_progress.getEndX() + 5, bar_progress.getY() + bar_progress.get("height"),
				bar_progress.getEndX(), bar_progress.getY() + bar_progress.get("height") - 8.66
			)
			.addClass('handle progress')
			.appendTo(this.handle_group)
		}
	},
	draw_invalid_bar: function() {
		var x = this.gantt.offset +
			(moment().startOf('day').diff(this.gantt.start, 'hours') /
			this.gantt.step *
			this.gantt.unit_width);

		this.canvas.rect(x, this.y,
			this.gantt.unit_width*2, this.height,
			this.corner_radius, this.corner_radius)
			.addClass("bar-invalid")
			.appendTo(this.bar_group);
			//continue here
		this.canvas.text(x + this.gantt.unit_width,
				this.y + this.height/2,
				'Dates not set')
			.addClass("bar-label big")
			.appendTo(this.bar_group);
	},
	bind: function () {
		if(this.invalid) return;
		this.show_details();
		this.bind_resize();
		this.bind_drag();
		this.bind_resize_progress();
	},
	show_details: function () {
		var me = this;

		var details_box = me.popover_group.select('.details-wrapper');
		if(!details_box) {
			details_box = me.canvas.group().addClass('details-wrapper');
			details_box.appendTo(me.popover_group);
			me.canvas.rect(0, 0, 0, 110, 2, 2)
				.addClass('details-container')
				.appendTo(details_box);
			me.canvas.text(0, 0, "")
				.attr({ dx: 10, dy: 30 })
				.addClass('details-heading')
				.appendTo(details_box);
			me.canvas.text(0, 0, "")
				.attr({ dx: 10, dy: 65 })
				.addClass('details-body')
				.appendTo(details_box);
			me.canvas.text(0, 0, "")
				.attr({ dx: 10, dy: 90 })
				.addClass('details-body')
				.appendTo(details_box);
		}


		this.group.mouseover(function (e, x, y) {
			me.popover_group.removeClass('hide');

			var pos = me.get_details_position();
			details_box.transform("t" + pos.x + "," + pos.y);

			var heading = me.task.name + ": " +
				me.task._start.format("MMM D") + " - " +
				me.task._end.format("MMM D");

			var $heading = me.popover_group.select('.details-heading');
			$heading.attr('text', heading);

			var bbox = $heading.getBBox();
			details_box.select('.details-container').attr({
				width: bbox.width + 20
			});

			var body1 = "Duration: " +
				me.task._end.diff(me.task._start, 'days') + " days";
			var body2 = me.task.progress ?
				"Progress: " + me.task.progress + "%" : "";

			var $body = me.popover_group.selectAll('.details-body');
			$body[0].attr('text', body1);
			$body[1].attr('text', body2);
		});
		this.group.mouseout(function () {
			setTimeout(function () {
				me.popover_group.addClass('hide');
			}, 500);
		});
	},
	get_details_position: function () {
		return {
			x: this.$bar.getEndX() + 2,
			y: this.$bar.getY() - 10
		};
	},
	bind_resize: function() {
		var me = this;
		var bar = this.$bar;
		var handle = me.get_handles();
		handle.right.drag(onmove_right, onstart, onstop_right);
		handle.left.drag(onmove_left, onstart, onstop_left);

		function onstart() {
			bar.ox = bar.getX();
			bar.oy = bar.getY();
			bar.owidth = bar.getWidth();
			this.ox = this.getX();
			this.oy = this.getY();
			bar.finaldx = 0;
		}

		function onmove_right(dx, dy) {
			bar.finaldx = me.get_snap_position(me, bar, dx);
			me.update_bar_position(null, bar.owidth + bar.finaldx);
		}
		function onstop_right() {
			if(bar.finaldx) me.date_changed();
			me.set_action_completed();
		}

		function onmove_left(dx, dy) {
			bar.finaldx = me.get_snap_position(dx);
			me.update_bar_position(bar.ox + bar.finaldx, bar.owidth - bar.finaldx);
		}
		function onstop_left() {
			if(bar.finaldx) me.date_changed();
			me.set_action_completed();
		}
	},
	get_handles: function() {
		var me = this;
		return {
			left: me.handle_group.select('.handle.left'),
			right: me.handle_group.select('.handle.right')
		};
	},
	bind_drag: function() {
		var me = this;
		var bar = this.$bar;
		this.bar_group.drag(onmove, onstart, onstop);

		function onmove(dx, dy) {
			bar.finaldx = me.get_snap_position(dx);
			me.update_bar_position(bar.ox + bar.finaldx);
		}
		function onstop() {
			if(!bar.finaldx) return;
			me.date_changed();
			me.set_action_completed();
		}
		function onstart() {
			bar.ox = bar.getX();
			bar.finaldx = 0;
		}
	},
	bind_resize_progress: function() {
		var me = this;
		var bar = this.$bar;
		var bar_progress = this.$bar_progress;
		var handle = me.group.select('.handle.progress');
		handle && handle.drag(onmove, onstart, onstop);

		function onmove(dx, dy) {
			if(dx > bar_progress.max_dx) {
				dx = bar_progress.max_dx;
			}
			if(dx < bar_progress.min_dx) {
				dx = bar_progress.min_dx;
			}

			bar_progress.attr("width", bar_progress.owidth + dx);
			handle.transform("t"+dx+",0");
			bar_progress.finaldx = dx;
		}
		function onstop() {
			if(!bar_progress.finaldx) return;
			me.progress_changed();
			me.set_action_completed();
		}
		function onstart() {
			bar_progress.finaldx = 0;
			bar_progress.owidth = bar_progress.getWidth();
			bar_progress.min_dx = -bar_progress.getWidth();
			bar_progress.max_dx = bar.getWidth() - bar_progress.getWidth();
		}
	},
	view_is: function(modes) {
		var me = this;
		if (typeof modes === 'string') {
			return me.gantt.view_mode === modes;
		} else {
			for (var i = 0; i < modes.length; i++) {
				if(me.gantt.view_mode === modes[i]) return true;
			}
			return false;
		}
	},
	update_bar_position: function(x, width) {
		var bar = this.$bar;
		if(x) this.update_attr(bar, "x", x);
		if(width) this.update_attr(bar, "width", width);
		this.update_label_position();
		this.update_handle_position();
		this.update_progressbar_position();
		this.update_arrow_position();
		this.update_details_position();
	},
	click: function(callback) {
		var me = this;
		this.group.click(function() {
			if(me.action_completed) {
				// just finished a move action, wait for a few seconds
				return;
			}
			if(me.group.hasClass('active')) {
				callback(me.task);
			}
			me.unselect_all();
			me.group.toggleClass('active');
		});
	},
	date_changed: function() {
		this.events.on_date_change &&
		this.events.on_date_change(
			this.task,
			this.compute_start_date(),
			this.compute_end_date()
		);
	},
	progress_changed: function() {
		this.events.on_progress_change &&
		this.events.on_progress_change(
			this.task,
			this.compute_progress()
		);
	},
	set_action_completed: function() {
		var me = this;
		this.action_completed = true;
		setTimeout(function() { me.action_completed = false; }, 2000);
	},
	compute_date: function(x) {
		var shift = (x - this.compute_x())/this.gantt.unit_width;
		var date = this.task._start.clone().add(this.gantt.step*shift, 'hours');
		return date;
	},
	compute_start_date: function() {
		var bar = this.$bar,
			shift = (bar.getX() - this.compute_x()) / this.gantt.unit_width,
			new_start_date = this.task._start.clone().add(this.gantt.step*shift, 'hours');
		return new_start_date;
	},
	compute_end_date: function() {
		var bar = this.$bar,
			og_x = this.compute_x() + this.duration * this.gantt.unit_width,
			final_x = bar.getEndX(),
			shift = (final_x - og_x) / this.gantt.unit_width,
			new_end_date = this.task._end.clone().add(this.gantt.step*shift, 'hours');
		return new_end_date;
	},
	compute_progress: function() {
		return this.$bar_progress.getWidth() / this.$bar.getWidth() * 100;
	},
	compute_x: function() {
		var x = this.gantt.offset +
			(this.task._start.diff(this.gantt.start, 'hours')/this.gantt.step *
			 this.gantt.unit_width);
		if(this.view_is('Month')) {
			x = this.gantt.offset +
				this.task._start.diff(this.gantt.start, 'days') *
				this.gantt.unit_width/30;
		}
		return x;
	},
	compute_y: function() {
		return this.gantt.header_height + this.gantt.padding +
			this.task._index * (this.height + this.gantt.padding);
	},
	get_snap_position: function(dx) {
		var me = this;
		var odx = dx, rem, position;

		if (me.view_is('Week')) {
			rem = dx % (me.gantt.unit_width/7);
			position = odx - rem +
				((rem < me.gantt.unit_width/14) ? 0 : me.gantt.unit_width/7);
		} else if (me.view_is('Month')) {
			rem = dx % (me.gantt.unit_width/30);
			position = odx - rem +
				((rem < me.gantt.unit_width/60) ? 0 : me.gantt.unit_width/30);
		} else {
			rem = dx % me.gantt.unit_width;
			position =  odx - rem +
				((rem < me.gantt.unit_width/2) ? 0 : me.gantt.unit_width);
		}
		return position;
	},
	update_attr: function(element, attr, value) {
		value = +value;
		if(!isNaN(value)) {
			element.attr(attr, value);
		}
		return element;
	},
	update_progressbar_position: function() {
		this.$bar_progress.attr('x', this.$bar.getX());
		this.$bar_progress.attr('width', this.$bar.getWidth() * (this.task.progress/100));
	},
	update_label_position: function() {
		var bar = this.$bar,
		label = this.group.select('.bar-label');
		if(label.getBBox().width > bar.getWidth()){
			label.addClass('big').attr('x', bar.getX() + bar.getWidth() + 5);
		} else {
			label.removeClass('big').attr('x', bar.getX() + bar.getWidth()/2);
		}
	},
	update_handle_position: function() {
		var bar = this.$bar;
		this.handle_group.select(".handle.left").attr({
			"x": bar.getX() + 1,
		});
		this.handle_group.select(".handle.right").attr({
			"x": bar.getX() + bar.getWidth() - 9,
		});
	},
	update_arrow_position: function() {
		this.arrows.forEach(function(arrow) {
			arrow.update();
		});
	},
	update_details_position: function() {
		var details_box = this.popover_group.select('.details-wrapper');
		var pos = this.get_details_position();
		details_box.transform("t" + pos.x + "," + pos.y);
	},
	unselect_all: function() {
		this.canvas.selectAll('.bar-wrapper').forEach(function(el) {
			el.removeClass('active');
		});
	}
});