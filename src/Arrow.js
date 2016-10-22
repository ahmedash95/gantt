/*
	Class: Arrow
	from_task ---> to_task

	Opts:
		gantt (Gantt object)
		from_task (Bar object)
		to_task (Bar object)
*/

var Arrow = Class.extend({
	init: function (opts) {
		for(var key in opts) {
			if(opts.hasOwnProperty(key))
				this[key] = opts[key];
		}
		this.prepare();
		this.draw();
	},
	prepare: function() {
		var gantt = this.gantt,
		from_task = this.from_task,
		to_task = this.to_task;

		this.start_x =from_task.$bar.getX() + from_task.$bar.getWidth()/2;

		while(to_task.$bar.getX() < this.start_x + gantt.opts.padding &&
			this.start_x > from_task.$bar.getX() + gantt.opts.padding)
		{
			this.start_x -= 10;
		}

		this.start_y = gantt.opts.header_height + gantt.opts.bar.height +
			(gantt.opts.padding + gantt.opts.bar.height) * from_task.task._index +
			gantt.opts.padding;

		this.end_x = to_task.$bar.getX() - gantt.opts.padding/2;
		this.end_y = gantt.opts.header_height + gantt.opts.bar.height/2 +
			(gantt.opts.padding + gantt.opts.bar.height) * to_task.task._index +
			gantt.opts.padding;

		var from_is_below_to = (from_task.task._index > to_task.task._index);
		this.curve = gantt.opts.arrow.curve;
		this.clockwise = from_is_below_to ? 1 : 0;
		this.curve_y = from_is_below_to ? -this.curve : this.curve;
		this.offset = from_is_below_to ?
			this.end_y + gantt.opts.arrow.curve:
			this.end_y - gantt.opts.arrow.curve;

		this.path =
			Snap.format("M {start_x} {start_y} V {offset} " +
				"a {curve} {curve} 0 0 {clockwise} {curve} {curve_y} " +
				"L {end_x} {end_y} m -5 -5 l 5 5 l -5 5",
			{
				start_x: this.start_x,
				start_y: this.start_y,
				end_x: this.end_x,
				end_y: this.end_y,
				offset: this.offset,
				curve: this.curve,
				clockwise: this.clockwise,
				curve_y: this.curve_y
			});

		if(to_task.$bar.getX() < from_task.$bar.getX() + gantt.opts.padding) {
			this.path =
				Snap.format("M {start_x} {start_y} v {down_1} " +
				"a {curve} {curve} 0 0 1 -{curve} {curve} H {left} " +
				"a {curve} {curve} 0 0 {clockwise} -{curve} {curve_y} V {down_2} " +
				"a {curve} {curve} 0 0 {clockwise} {curve} {curve_y} " +
				"L {end_x} {end_y} m -5 -5 l 5 5 l -5 5",
			{
				start_x: this.start_x,
				start_y: this.start_y,
				end_x: this.end_x,
				end_y: this.end_y,
				down_1: this.gantt.opts.padding/2 - this.curve,
				down_2: to_task.$bar.getY() + to_task.$bar.get('height')/2 - this.curve_y,
				left: to_task.$bar.getX() - gantt.opts.padding,
				offset: this.offset,
				curve: this.curve,
				clockwise: this.clockwise,
				curve_y: this.curve_y
			});
		}
	},
	draw: function() {
		this.element = this.gantt.canvas.path(this.path)
			.attr("data-from", this.from_task.task.id)
			.attr("data-to", this.to_task.task.id);
	},
	update: function() {
		this.prepare();
		this.element.attr('d', this.path);
	}
});