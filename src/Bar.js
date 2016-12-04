/*
	Class: Bar

	Opts:
		canvas [reqd]
		task [reqd]
		unit_width [reqd]
		x
		y
*/

function Bar(gt, task, config) {

	const self = Object.assign({}, this, params);

	function init () {
		set_defaults();
		prepare();
		draw();
		bind();
	}
	
	function set_defaults () {
		self.config = Object.assign({}, config);
		self.action_completed = false;
	}
	
	function prepare () {
		prepare_values();
		prepare_plugins();
	}
	
	function prepare_values() {
		self.invalid = self.task.invalid;
		self.x = compute_x();
		self.y = compute_y();
		self.height = 20;
		self.corner_radius = 3;
		self.duration = (self.task._end.diff(self.task._start, 'hours') + 24) / self.gt.config.step;
		self.width = self.gt.config.unit_width * self.duration;
		self.progress_width = self.gt.config.unit_width * self.duration * (self.task.progress / 100) || 0;
		self.group = self.gt.canvas.group().addClass('bar-wrapper');
		self.bar_group = self.gt.canvas.group().addClass('bar-group').appendTo(self.group);
		self.handle_group = self.gt.canvas.group().addClass('handle-group').appendTo(self.group);
	}
	
	function prepare_plugins() {
		Snap.plugin(function (Snap, Element, Paper, global, Fragment) {
			Element.prototype.getX = function () {
				return +this.attr("x");
			};
			Element.prototype.getY = function () {
				return +this.attr("y");
			};
			Element.prototype.getWidth = function () {
				return +this.attr("width");
			};
			Element.prototype.getEndX = function () {
				return this.getX() + this.getWidth();
			};
		});
	}
	
	function draw () {
		draw_bar();
		draw_progress_bar();
		draw_label();
		draw_resize_handles();
	}
	
	function draw_bar() {
		self.$bar = self.gt.canvas.rect(self.x, self.y,
			self.width, self.height,
			self.corner_radius, self.corner_radius)
			.addClass("bar")
			.appendTo(self.bar_group);
		if(self.invalid) {
			self.$bar.addClass('bar-invalid');
		}
	}
	
	function draw_progress_bar() {
		if(self.invalid) return;
		self.$bar_progress = self.gt.canvas.rect(self.x, self.y,
			self.progress_width, self.height,
			self.corner_radius, self.corner_radius)
			.addClass("bar-progress")
			.appendTo(self.bar_group);
	}
	
	function draw_label() {
		self.gt.canvas.text(self.x + self.width / 2,
			self.y + self.height / 2,
			self.task.name)
			.addClass("bar-label")
			.appendTo(self.bar_group);
		update_label_position();
	}
	
	function draw_resize_handles() {
		if(self.invalid) return;

		const bar = self.$bar,
		bar_progress = self.$bar_progress,
		handle_width = 8;

		self.gt.canvas.rect(bar.getX() + bar.getWidth() - 9, bar.getY() + 1,
			handle_width, self.height - 2, self.corner_radius, self.corner_radius)
				.addClass('handle right')
				.appendTo(self.handle_group);
		self.gt.canvas.rect(bar.getX() + 1, bar.getY() + 1,
			handle_width, self.height - 2, self.corner_radius, self.corner_radius)
			.addClass('handle left')
			.appendTo(self.handle_group);

		if(self.task.progress && self.task.progress < 100) {
			self.canvas.polygon(
				bar_progress.getEndX() - 5, bar_progress.getY() + bar_progress.get("height"),
				bar_progress.getEndX() + 5, bar_progress.getY() + bar_progress.get("height"),
				bar_progress.getEndX(), bar_progress.getY() + bar_progress.get("height") - 8.66
			)
			.addClass('handle progress')
			.appendTo(self.handle_group);
		}
	}
	
	function draw_invalid_bar() {
		const x = moment().startOf('day').diff(self.gt.gantt_start, 'hours') /
			self.gt.config.step * self.gt.config.unit_width;

		self.canvas.rect(x, self.y,
			self.gt.config.unit_width*2, self.height,
			self.corner_radius, self.corner_radius)
			.addClass("bar-invalid")
			.appendTo(self.bar_group);
			
		self.canvas.text(
			x + self.gt.config.unit_width,
			self.y + self.height/2,
			'Dates not set')
			.addClass("bar-label big")
			.appendTo(self.bar_group);
	}
	
	function bind () {
		if(self.invalid) return;
		// self.show_details();
		bind_resize();
		bind_drag();
		bind_resize_progress();
	}
	
	function show_details () {
		const popover_group = self.gt.element_groups.details;
		let details_box = popover_group.select('.details-wrapper');
		
		if(!details_box) {
			details_box = self.gt.canvas.group()
				.addClass('details-wrapper')
				.appendTo(popover_group);
			self.canvas.rect(0, 0, 0, 110, 2, 2)
				.addClass('details-container')
				.appendTo(details_box);
			self.canvas.text(0, 0, "")
				.attr({ dx: 10, dy: 30 })
				.addClass('details-heading')
				.appendTo(details_box);
			self.canvas.text(0, 0, "")
				.attr({ dx: 10, dy: 65 })
				.addClass('details-body')
				.appendTo(details_box);
			self.canvas.text(0, 0, "")
				.attr({ dx: 10, dy: 90 })
				.addClass('details-body')
				.appendTo(details_box);
		}


		self.group.mouseover((e, x, y) => {
			popover_group.removeClass('hide');

			const pos = get_details_position();
			details_box.transform(`t{pos.x},{pos.y}`);

			const start_date = self.task._start.format("MMM D"),
			end_date = self.task._end.format("MMM D"), 
			heading = `{self.task.name}: {start_date} - {end_date}`;

			const $heading = popover_group
				.select('.details-heading')
				.attr('text', heading);

			const bbox = $heading.getBBox();
			details_box.select('.details-container')
				.attr({ width: bbox.width + 20 });

			const duration = self.task._end.diff(self.task._start, 'days'),
			body1 = `Duration: {duration} days`,
			body2 = self.task.progress ?
				`Progress: {self.task.progress}` : "";

			const $body = popover_group.selectAll('.details-body');
			$body[0].attr('text', body1);
			$body[1].attr('text', body2);
		});

		self.group.mouseout(() => {
			setTimeout(() => popover_group.addClass('hide'), 500);
		});
	}
	
	function get_details_position () {
		return {
			x: self.$bar.getEndX() + 2,
			y: self.$bar.getY() - 10
		};
	}
	
	function bind_resize() {
		const { left, right } = get_handles();

		left.drag(onmove_left, onstart, onstop_left);
		right.drag(onmove_right, onstart, onstop_right);

		function onstart() {
			onstart();
			this.ox = this.getX();
			this.oy = this.getY();
		}

		function onmove_right(dx, dy) {
			onmove_handle_right(dx, dy);
		}
		function onstop_right() {
			onstop_handle_right();
		}

		function onmove_left(dx, dy) {
			onmove_handle_left(dx, dy);
		}
		function onstop_left() {
			onstop_handle_left();
		}
	}
	
	function get_handles() {
		return {
			left: self.handle_group.select('.handle.left'),
			right: self.handle_group.select('.handle.right')
		};
	}
	
	function bind_drag() {
		self.bar_group.drag(onmove, onstart, onstop);

		function onmove(dx, dy) {
			onmove(dx, dy);
		}
		function onstop() {
			onstop();
		}
		function onstart() {
			onstart();
		}
	}
	
	
	function bind_resize_progress() {
		const bar = self.$bar,
		bar_progress = self.$bar_progress,
		handle = self.group.select('.handle.progress');
		handle && handle.drag(onmove, onstart, onstop);

		function onmove(dx, dy) {
			if(dx > bar_progress.max_dx) {
				dx = bar_progress.max_dx;
			}
			if(dx < bar_progress.min_dx) {
				dx = bar_progress.min_dx;
			}

			bar_progress.attr("width", bar_progress.owidth + dx);
			handle.transform(`t{dx},0`);
			bar_progress.finaldx = dx;
		}
		function onstop() {
			if(!bar_progress.finaldx) return;
			progress_changed();
			set_action_completed();
		}
		function onstart() {
			bar_progress.finaldx = 0;
			bar_progress.owidth = bar_progress.getWidth();
			bar_progress.min_dx = -bar_progress.getWidth();
			bar_progress.max_dx = bar.getWidth() - bar_progress.getWidth();
		}
	}
	
	function onstart() {
		const bar = self.$bar;
		bar.ox = bar.getX();
		bar.oy = bar.getY();
		bar.owidth = bar.getWidth();
		bar.finaldx = 0;
		run_method_for_dependencies(arguments.callee);
	}
	
	function onmove (dx, dy) {
		const bar = self.$bar;
		bar.finaldx = get_snap_position(dx);
		update_bar_position(bar.ox + bar.finaldx);
		run_method_for_dependencies(arguments.callee, [dx, dy]);
	}
	
	function onstop () {
		const bar = self.$bar;
		if(!bar.finaldx) return;
		date_changed();
		set_action_completed();
		run_method_for_dependencies(arguments.callee);
	}

	function onmove_handle_left (dx, dy) {
		const bar = self.$bar;
		bar.finaldx = get_snap_position(dx);
		update_bar_position(bar.ox + bar.finaldx, bar.owidth - bar.finaldx);
		run_method_for_dependencies(arguments.callee, [dx, dy]);
	}
	
	function onstop_handle_left () {
		const bar = self.$bar;
		if(bar.finaldx) date_changed();
		set_action_completed();
		run_method_for_dependencies(arguments.callee);
	}
	
	function run_method_for_dependencies(fn, args) {
		const dm = self.gt.dependency_map;
		if(dm[self.task.id]) {
			for(let deptask of dm[self.task.id]) {
				const dt = self.gantt_obj.get_bar(deptask); 
				fn.apply(dt, args);
			}
		}
	}
	
	function onmove_handle_right (dx, dy) {
		const bar = self.$bar;
		bar.finaldx = get_snap_position(dx);
		update_bar_position(null, bar.owidth + bar.finaldx);
	}
	
	function onstop_handle_right () {
		const bar = self.$bar;
		if(bar.finaldx) date_changed();
		set_action_completed();
	}
	
	function update_bar_position(x, width) {
		const bar = self.$bar;
		if(x) update_attr(bar, "x", x);
		if(width) update_attr(bar, "width", width);
		update_label_position();
		update_handle_position();
		update_progressbar_position();
		update_arrow_position();
		update_details_position();
	}
	
	function click(callback) {
		self.group.click(function() {
			if(self.action_completed) {
				// just finished a move action, wait for a few seconds
				return;
			}
			if(self.group.hasClass('active')) {
				callback(self.task);
			}
			unselect_all();
			self.group.toggleClass('active');
		});
	}
	
	function date_changed() {
		self.events.on_date_change &&
		self.events.on_date_change(
			self.task,
			compute_start_date(),
			compute_end_date()
		);
	}
	
	function progress_changed() {
		self.events.on_progress_change &&
		self.events.on_progress_change(
			self.task,
			compute_progress()
		);
	}
	
	function set_action_completed() {
		self.action_completed = true;
		setTimeout(() => self.action_completed = false, 2000);
	}
	
	function compute_date(x) {
		const shift = (x - compute_x()) / self.gt.config.unit_width;
		const date = self.task._start.clone().add(self.gt.config.step*shift, 'hours');
		return date;
	}
	
	function compute_start_date() {
		const bar = self.$bar,
			shift = (bar.getX() - compute_x()) / self.gt.config.unit_width,
			new_start_date = self.task._start.clone().add(self.gt.config.step*shift, 'hours');
		return new_start_date;
	}
	
	function compute_end_date() {
		const bar = self.$bar,
			og_x = compute_x() + self.duration * self.gt.config.unit_width,
			final_x = bar.getEndX(),
			shift = (final_x - og_x) / self.gt.config.unit_width,
			new_end_date = self.task._end.clone().add(self.gt.config.step*shift, 'hours');
		return new_end_date;
	}
	
	function compute_progress() {
		return self.$bar_progress.getWidth() / self.$bar.getWidth() * 100;
	}
	
	function compute_x() {
		let x = self.task._start.diff(self.gt.gantt_start, 'hours') /
			self.gt.config.step * self.gantt.unit_width;
		
		if(self.gt.view_is('Month')) {
			x = self.task._start.diff(self.gantt.start, 'days') *
				self.gantt.unit_width / 30;
		}
		return x;
	}
	
	function compute_y() {
		return self.gt.config.header_height + self.gt.config.padding +
			self.task._index * (self.height + self.gt.config.padding);
	}
	
	function get_snap_position(dx) {
		let odx = dx, rem, position;

		if (self.gt.view_is('Week')) {
			rem = dx % (self.gt.config.unit_width/7);
			position = odx - rem +
				((rem < self.gt.config.unit_width/14) ? 0 : self.gt.config.unit_width/7);
		} else if (self.gt.view_is('Month')) {
			rem = dx % (self.gt.config.unit_width/30);
			position = odx - rem +
				((rem < self.gt.config.unit_width/60) ? 0 : self.gt.config.unit_width/30);
		} else {
			rem = dx % self.gt.config.unit_width;
			position =  odx - rem +
				((rem < self.gt.config.unit_width/2) ? 0 : self.gt.config.unit_width);
		}
		return position;
	}
	
	function update_attr(element, attr, value) {
		value = +value;
		if(!isNaN(value)) {
			element.attr(attr, value);
		}
		return element;
	}
	
	function update_progressbar_position() {
		self.$bar_progress.attr('x', self.$bar.getX());
		self.$bar_progress.attr('width', self.$bar.getWidth() * (self.task.progress/100));
	}
	
	function update_label_position() {
		const bar = self.$bar,
		label = self.group.select('.bar-label');
		if(label.getBBox().width > bar.getWidth()){
			label.addClass('big').attr('x', bar.getX() + bar.getWidth() + 5);
		} else {
			label.removeClass('big').attr('x', bar.getX() + bar.getWidth()/2);
		}
	}
	
	function update_handle_position() {
		const bar = self.$bar;
		self.handle_group.select(".handle.left").attr({
			"x": bar.getX() + 1,
		});
		self.handle_group.select(".handle.right").attr({
			"x": bar.getX() + bar.getWidth() - 9,
		});
	}
	
	function update_arrow_position() {
		for(let arrow of self.arrows) {
			arrow.update();
		}
	}
	
	function update_details_position() {
		const details_box = self.gt.element_groups.details.select('.details-wrapper');
		const pos = get_details_position();
		details_box && details_box.transform(`t{pos.x},{pos.y}`);
	}
	
	function unselect_all() {
		self.gt.canvas.selectAll('.bar-wrapper').forEach(function(el) {
			el.removeClass('active');
		});
	}

	init();
}	
