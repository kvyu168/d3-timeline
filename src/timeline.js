
import { axisBottom, axisTop } from 'd3-axis';
import { range } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { timeHour } from 'd3-time';
import { scaleOrdinal, scaleTime, scaleLinear, schemeCategory20 } from 'd3-scale';
import { createor, local, matcher, mouse, namespace, namespaces, select, selectAll, selection, selector, selectorAll, styleValue as style, touch, touches, window, event, customEvent } from 'd3-selection';

//import * as d3 from 'd3';

var timeline = function() {
		var DISPLAY_TYPES = ["circle", "rect"];

		var hover = function () {},
				mouseover = function () {},
				mouseout = function () {},
				click = function () {},
				scroll = function () {},
				labelFunction = function(label) { return label; },
				labelFloat = 0,  // floats up this many pixels
				navigateLeft = function () {},
				navigateRight = function () {},
				orient = "bottom",
				width = null,
				height = null,
				rowSeparatorsColor = null,
				backgroundColor = null,
				tickFormat = {
					format: timeFormat("%I %p"),
					tickTime: timeHour,
					tickInterval: 1,
					tickSize: 6,
					tickValues: null
				},
				colorCycle = scaleOrdinal(schemeCategory20),
				colorPropertyName = null,
				display = "rect",
				beginning = 0,
				labelMargin = 0,
				ending = 0,
				margin = {left: 30, right:30, top: 30, bottom:30},
				stacked = false,
				rotateTicks = false,
				timeIsRelative = false,
				timeIsLinear = false,
				fullLengthBackgrounds = false,
				itemHeight = 20,
				itemMargin = 5,
				navMargin = 60,
				showTimeAxis = true,
				showAxisTop = false,
				showTodayLine = false,
				timeAxisTick = false,
				timeAxisTickFormat = {stroke: "stroke-dasharray", spacing: "4 10"},
				showTodayFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
				showBorderLine = false,
				showBorderFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
				showAxisHeaderBackground = false,
				showAxisNav = false,
				showAxisCalendarYear = false,
				axisBgColor = "white",
				chartData = {}
			;

		var appendTimeAxis = function(g, xAxis, yPosition) {

			if(showAxisHeaderBackground){ appendAxisHeaderBackground(g, 0, 0); }

			if(showAxisNav){ appendTimeAxisNav(g); }

			var axis = g.append("g")
				.attr("class", "axis")
				.attr("transform", "translate(" + 0 + "," + yPosition + ")")
				.call(xAxis);

      return axis;
		};

		var appendTimeAxisCalendarYear = function (nav) {
			var calendarLabel = beginning.getFullYear();

			if (beginning.getFullYear() != ending.getFullYear()) {
				calendarLabel = beginning.getFullYear() + "-" + ending.getFullYear();
			}

			nav.append("text")
				.attr("transform", "translate(" + 20 + ", 0)")
				.attr("x", 0)
				.attr("y", 14)
				.attr("class", "calendarYear")
				.text(calendarLabel)
			;
		};

		var appendTimeAxisNav = function (g) {
			var timelineBlocks = 6;
			var leftNavMargin = (margin.left - navMargin);
			var incrementValue = (width - margin.left)/timelineBlocks;
			var rightNavMargin = (width - margin.right - incrementValue + navMargin);

			var nav = g.append('g')
					.attr("class", "axis")
					.attr("transform", "translate(0, 20)")
				;

			if(showAxisCalendarYear) { appendTimeAxisCalendarYear(nav); }

			nav.append("text")
				.attr("transform", "translate(" + leftNavMargin + ", 0)")
				.attr("x", 0)
				.attr("y", 14)
				.attr("class", "chevron")
				.text("<")
				.on("click", function () {
					return navigateLeft(beginning, chartData);
				})
			;

			nav.append("text")
				.attr("transform", "translate(" + rightNavMargin + ", 0)")
				.attr("x", 0)
				.attr("y", 14)
				.attr("class", "chevron")
				.text(">")
				.on("click", function () {
					return navigateRight(ending, chartData);
				})
			;
		};

		var appendAxisHeaderBackground = function (g, xAxis, yAxis) {
			g.insert("rect")
				.attr("class", "row-green-bar")
				.attr("x", xAxis)
				.attr("width", width)
				.attr("y", yAxis)
				.attr("height", itemHeight)
				.attr("fill", axisBgColor);
		};

		var appendTimeAxisTick = function(g, xAxis, maxStack) {
			g.append("g")
				.attr("class", "axis")
				.attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * maxStack) + ")")
				.attr(timeAxisTickFormat.stroke, timeAxisTickFormat.spacing)
				.call(xAxis.tickFormat("").tickSize(-(margin.top + (itemHeight + itemMargin) * (maxStack - 1) + 3), 0, 0));
		};

		var appendBackgroundBar = function (yAxisMapping, index, g, data, datum) {
			var greenbarYAxis = ((itemHeight + itemMargin) * yAxisMapping[index]) + margin.top;
			g.selectAll("svg").data(data).enter()
				.insert("rect")
				.attr("class", "row-green-bar")
				.attr("x", fullLengthBackgrounds ? 0 : margin.left)
				.attr("width", fullLengthBackgrounds ? width : (width - margin.right - margin.left))
				.attr("y", greenbarYAxis)
				.attr("height", itemHeight)
				.attr("fill", backgroundColor instanceof Function ? backgroundColor(datum, index) : backgroundColor)
			;
		};

		var appendLabel = function (gParent, yAxisMapping, index, hasLabel, datum) {
			var fullItemHeight    = itemHeight + itemMargin;
			var rowsDown          = margin.top + (fullItemHeight/2) + fullItemHeight * (yAxisMapping[index] || 1);

			gParent.append("text")
				.attr("class", "timeline-label")
				.attr("transform", "translate(" + labelMargin + "," + rowsDown + ")")
				.text(hasLabel ? labelFunction(datum.label) : datum.id)
				.on("click", function (d, i) {
					console.log("label click!");
					var point = mouse(this);
					gParent.append("rect").attr("id", "clickpoint").attr("x", point[0]).attr("width", 10).attr("height", itemHeight);
					click(d, index, datum, point, xScale.invert(point[0]));
				});
		};

    /*###########################
    ####    START timeline    ###
    #############################*/
		function timeline (gParent) {
      var gParentSize = gParent._groups[0][0].getBoundingClientRect(); // the svg size
      var gParentItem = select(gParent._groups[0][0]); // the svg

      // append a view for zoom/pan support
      var view = gParent.append("g")
        .attr("class", "view")
        .attr("width", gParentSize.width)
        .attr("height", gParentSize.height)
        .attr("x", 0.5)
        .attr("y", 0.5);

			var g = view.append("g").attr("class", "container");


			var yAxisMapping = {},
				maxStack = 1,
				minTime = 0,
				maxTime = 0;

			setWidth();

			// check if the user wants relative time
			// if so, substract the first timestamp from each subsequent timestamps
			if(timeIsRelative){
				g.each(function (d, i) {
					var originTime = 0;
					d.forEach(function (datum, index) {
						datum.times.forEach(function (time, j) {
							if(index === 0 && j === 0){
								originTime = time.starting_time;               //Store the timestamp that will serve as origin
								time.starting_time = 0;                        //Set tahe origin
								time.ending_time = time.ending_time - originTime;     //Store the relative time (millis)
							}else{
								time.starting_time = time.starting_time - originTime;
								time.ending_time = time.ending_time - originTime;
							}
						});
					});
				});

			}

			// check how many stacks we're gonna need
			// do this here so that we can draw the axis before the graph
			if (stacked || ending === 0 || beginning === 0) {
				g.each(function (d, i) {
					d.forEach(function (datum, index) {

						// create y mapping for stacked graph
						if (stacked && Object.keys(yAxisMapping).indexOf(index) == -1) {
							yAxisMapping[index] = maxStack;
							maxStack++;
						}

						// figure out beginning and ending times if they are unspecified
						datum.times.forEach(function (time, i) {
							if(beginning === 0)
								if (time.starting_time < minTime || (minTime === 0 && timeIsRelative === false))
									minTime = time.starting_time;
							if(ending === 0)
								if (time.ending_time > maxTime)
									maxTime = time.ending_time;
						});
					});
				});

				if (ending === 0) {
					ending = maxTime;
				}
				if (beginning === 0) {
					beginning = minTime;
				}
			}

			var scaleFactor = (1/(ending - beginning)) * (width - margin.left - margin.right);

			function formatDays(d) {
					var days = Math.floor(d / 86400),
							hours = Math.floor((d - (days * 86400)) / 3600),
							minutes = Math.floor((d - (days * 86400) - (hours * 3600)) / 60),
							seconds = d - (days * 86400) - (hours * 3600) - (minutes * 60);
					var output = '';
					if (seconds) {
						output = seconds + 's';
					}
					if (minutes) {
							output = minutes + 'm ' + output;
					}
					if (hours) {
							output = hours + 'h ' + output;
					}
					if (days) {
							output = days + 'd ' + output;
					}
					return output;
			};
			function formatMinutes(d) {
					var hours = Math.floor(d / 3600),
							minutes = Math.floor((d - (hours * 3600)) / 60),
							seconds = d - (minutes * 60);
					var output = seconds + 's';
					if (minutes) {
							output = minutes + 'm ' + output;
					}
					if (hours) {
							output = hours + 'h ' + output;
					}
					return output;
			};

			var xScale;
			var xAxis;
			if (orient == "bottom") {
				xAxis = axisBottom();
			} else if (orient == "top") {
				xAxis = axisTop();
			}
			if (timeIsLinear) {
				xScale = scaleLinear()
					.domain([beginning, ending])
					.range([margin.left, width - margin.right]);

				xAxis.scale(xScale)
					.tickFormat(formatDays)
					.tickValues(range(0, ending, 86400));
			} else {
					xScale = scaleTime()
						.domain([beginning, ending])
						.range([margin.left, width - margin.right]);

					xAxis.scale(xScale)
						.tickFormat(tickFormat.format)
						.tickSize(tickFormat.tickSize);
			}

			if (tickFormat.tickValues !== null) {
				xAxis.tickValues(tickFormat.tickValues);
			} else {
				xAxis.ticks(tickFormat.numTicks || tickFormat.tickTime, tickFormat.tickInterval);
			}

			// draw the chart
			g.each(function(d, i) {
				chartData = d;
				d.forEach( function(datum, index){
					var data = datum.times;
					data.forEach(function(d) { d.name = datum.name });

					var hasLabel = (typeof(datum.label) != "undefined");

					// issue warning about using id per data set. Ids should be individual to data elements
					if (typeof(datum.id) != "undefined") {
						console.warn("d3Timeline Warning: Ids per dataset is deprecated in favor of a 'class' key. Ids are now per data element.");
					}

					if (backgroundColor) { appendBackgroundBar(yAxisMapping, index, g, data, datum); }

					g.selectAll("svg").data(data).enter()
						.append(function(d, i) {
									return document.createElementNS(namespaces.svg, "display" in d? d.display:display);
						})
						.attr("x", getXPos)
						.attr("y", getStackPosition)
						.attr("width", function (d, i) {
							return (d.ending_time - d.starting_time) * scaleFactor;
						})
						.attr("cy", function(d, i) {
								return getStackPosition(d, i) + itemHeight/2;
						})
						.attr("cx", getXPos)
						.attr("r", itemHeight / 2)
						.attr("height", itemHeight)
						.style("fill", function(d, i){
							var dColorPropName;
							if (d.color) return d.color;
							if( colorPropertyName ){
								dColorPropName = d[colorPropertyName];
								if ( dColorPropName ) {
									return colorCycle( dColorPropName );
								} else {
									return colorCycle( datum[colorPropertyName] );
								}
							}
							return colorCycle(index);
						})
						.on("mousemove", function (d, i) {
							hover(d, index, datum);
						})
						.on("mouseover", function (d, i) {
							mouseover(d, i, datum);
						})
						.on("mouseout", function (d, i) {
							mouseout(d, i, datum);
						})
						.on("click", function (d, i) {
							var point = mouse(this);
							var selectedRect = select(this).node();
							var selectorLabel = "text#" + selectedRect.id + '.textnumbers';
							var selectedLabel = select(selectorLabel).node();
							click(d, index, datum, selectedLabel, selectedRect, xScale.invert(point[0]));
						})
						.attr("class", function (d, i) {
							return datum.class ? "timelineSeries_"+datum.class : "timelineSeries_"+index;
						})
						.attr("id", function(d, i) {
							// use deprecated id field
							if (datum.id && !d.id) {
								return 'timelineItem_'+datum.id;
							}

							return d.id ? d.id : "timelineItem_"+index+"_"+i;
						})
					;

					// appends the labels to the boxes - DAY/HOUR LABEL
					g.selectAll("svg").data(data).enter()
						.append("text")
						.attr("class", "textlabels")
						.attr("id", function(d) { return d.id })
						.attr("x", function(d, i) { return getXTextPos(d, i, d.label, '.textlabels')})
						.attr("y", (getStackTextPosition() - labelFloat))
						.text(function(d) {
							return d.label;
						})
						.on("click", function(d, i){
							// when clicking on the label, call the click for the rectangle with the same id
							var point = mouse(this);
							var id = this.id;
							var labelSelector = "text#" + id + ".textnumbers";
							//var selectedLabel = select(this).node();
							var selectedLabel = select(labelSelector).node();
							var selector = "rect#" + id;
							var selectedRect = select(selector).node();
							click(d, index, datum, selectedLabel, selectedRect, xScale.invert(point[0]));
						})
					;

					// appends the NUMBER LABEL
					g.selectAll("svg").data(data).enter()
						.filter(function(d) { return d.labelNumber !== undefined; })
						.append("text")
						.attr("class", "textnumbers")
						.attr("id", function(d) { return d.id })
						.attr("x", function(d, i) { return getXTextPos(d, i, d.labelNumber, '.textnumbers')})
						.attr("y", getStackTextPosition)
						.text(function(d) {
							return d.labelNumber;
						})
						.on("click", function(d, i){
							// when clicking on the label, call the click for the rectangle with the same id
							var point = mouse(this);
							var id = this.id;
							var selectedLabel = select(this).node();
							var selector = "rect#" + id;
							var selectedRect = select(selector).node();
							click(d, index, datum, selectedLabel, selectedRect, xScale.invert(point[0]));
						})
					;

					if (rowSeparatorsColor) {
						var lineYAxis = ( itemHeight + itemMargin / 2 + margin.top + (itemHeight + itemMargin) * yAxisMapping[index]);
						gParent.append("svg:line")
							.attr("class", "row-separator")
							.attr("x1", 0 + margin.left)
							.attr("x2", width - margin.right)
							.attr("y1", lineYAxis)
							.attr("y2", lineYAxis)
							.attr("stroke-width", 1)
							.attr("stroke", rowSeparatorsColor);
					}

					// add the label
					if (hasLabel) { appendLabel(gParent, yAxisMapping, index, hasLabel, datum); }

					if (typeof(datum.icon) !== "undefined") {
						gParent.append("image")
							.attr("class", "timeline-label")
							.attr("transform", "translate("+ 0 +","+ (margin.top + (itemHeight + itemMargin) * yAxisMapping[index])+")")
							.attr("xlink:href", datum.icon)
							.attr("width", margin.left)
							.attr("height", itemHeight);
					}

					function getStackPosition(d, i) {
						if (stacked) {
							return margin.top + (itemHeight + itemMargin) * yAxisMapping[index];
						}
						return margin.top;
					}
					function getStackTextPosition(d, i) {
						if (stacked) {
							return margin.top + (itemHeight + itemMargin) * yAxisMapping[index] + itemHeight * 0.75;
						}
						return margin.top + itemHeight * 0.75;
					}
				});
			});

			var belowLastItem = (margin.top + (itemHeight + itemMargin) * maxStack);
			var aboveFirstItem = margin.top;
			var timeAxisYPosition = showAxisTop ? aboveFirstItem : belowLastItem;
      var gX;
			if (showTimeAxis) { gX = appendTimeAxis(g, xAxis, timeAxisYPosition); }
			if (timeAxisTick) { appendTimeAxisTick(g, xAxis, maxStack); }

			if (rotateTicks) {
				g.selectAll(".tick text")
					.attr("transform", function(d) {
						return "rotate(" + rotateTicks + ")translate("
							               + (this.getBBox().width / 2 + 10) + "," // TODO: change this 10
							               + this.getBBox().height / 2 + ")";
					});
			}

      // use the size of the elements added to the timeline to set the height
      var gSize = g._groups[0][0].getBoundingClientRect();
			setHeight();

			if (showBorderLine) {
				g.each(function (d, i) {
					d.forEach(function (datum) {
						var times = datum.times;
						times.forEach(function (time) {
							appendLine(xScale(time.starting_time), showBorderFormat);
							appendLine(xScale(time.ending_time), showBorderFormat);
						});
					});
				});
			}

			if (showTodayLine) {
				var todayLine = xScale(new Date());
				appendLine(todayLine, showTodayFormat);
			}

			function getXPos(d, i) {
				return margin.left + (d.starting_time - beginning) * scaleFactor;
			}

			function getTextWidth(text, font) {
			    // re-use canvas object for better performance
			    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
			    var context = canvas.getContext("2d");
			    context.font = font;
			    var metrics = context.measureText(text);
			    return metrics.width;
			}

			function getXTextPos(d, i, text, style) {
				var width = 0;
				if (d.ending_time) {
					width = (((d.ending_time - d.starting_time) / 2) * scaleFactor);
				}
				if (text && style) {
					// get the style data for the class selector pass in
					var textl = getComputedStyle(document.querySelector(style));
					// create a fontsize fontfamily string - 12pt Graphik
					var fontInfo = textl.fontSize + ' ' + textl.fontFamily;
					// calculate the width of the text in that fontsize
					var tl = getTextWidth(text, fontInfo);
					// subtract half of the text length from the xPosition to keep the text centered
					var textLength = tl / 2;
					var xPosition = margin.left + ((d.starting_time - beginning) * scaleFactor) + width - textLength;
					return xPosition;
				} else {
					return margin.left + (d.starting_time - beginning) * scaleFactor + 5;
				}
			}

			function setHeight() {
				if (!height && !gParentItem.attr("height")) {
					if (itemHeight) {
						// set height based off of item height
						height = gSize.height + gSize.top - gParentSize.top;
						// set bounding rectangle height
						select(gParent._groups[0][0]).attr("height", height);
            select(view._groups[0][0]).attr("height", height);
					} else {
						throw "height of the timeline is not set";
					}
				} else {
					if (!height) {
						height = gParentItem.attr("height");
					} else {
						gParentItem.attr("height", height);
            view.attr("height", height);
					}
				}
			}

			function setWidth() {
				if (!width && !gParentSize.width) {
					try {
						width = gParentItem.attr("width");
						if (!width) {
							throw "width of the timeline is not set. As of Firefox 27, timeline().with(x) needs to be explicitly set in order to render";
						}
					} catch (err) {
						console.log( err );
					}
				} else if (!(width && gParentSize.width)) {
					try {
						width = gParentItem.attr("width");
					} catch (err) {
						console.log( err );
					}
				}
				// if both are set, do nothing
			}

			function appendLine(lineScale, lineFormat) {
				gParent.append("svg:line")
					.attr("x1", lineScale)
					.attr("y1", lineFormat.marginTop)
					.attr("x2", lineScale)
					.attr("y2", height - lineFormat.marginBottom)
					.style("stroke", lineFormat.color)//"rgb(6,120,155)"
					.style("stroke-width", lineFormat.width);
			}

		}

		// SETTINGS

		timeline.margin = function (p) {
			if (!arguments.length) return margin;
			margin = p;
			return timeline;
		};

		timeline.orient = function (orientation) {
			if (!arguments.length) return orient;
			orient = orientation;
			return timeline;
		};

		timeline.itemHeight = function (h) {
			if (!arguments.length) return itemHeight;
			itemHeight = h;
			return timeline;
		};

		timeline.itemMargin = function (h) {
			if (!arguments.length) return itemMargin;
			itemMargin = h;
			return timeline;
		};

		timeline.navMargin = function (h) {
			if (!arguments.length) return navMargin;
			navMargin = h;
			return timeline;
		};

		timeline.height = function (h) {
			if (!arguments.length) return height;
			height = h;
			return timeline;
		};

		timeline.width = function (w) {
			if (!arguments.length) return width;
			width = w;
			return timeline;
		};

		timeline.display = function (displayType) {
			if (!arguments.length || (DISPLAY_TYPES.indexOf(displayType) == -1)) return display;
			display = displayType;
			return timeline;
		};

		timeline.labelFormat = function(f) {
			if (!arguments.length) return labelFunction;
			labelFunction = f;
			return timeline;
		};

		timeline.tickFormat = function (format) {
			if (!arguments.length) return tickFormat;
			tickFormat = format;
			return timeline;
		};

		timeline.hover = function (hoverFunc) {
			if (!arguments.length) return hover;
			hover = hoverFunc;
			return timeline;
		};

		timeline.mouseover = function (mouseoverFunc) {
			if (!arguments.length) return mouseover;
			mouseover = mouseoverFunc;
			return timeline;
		};

		timeline.mouseout = function (mouseoutFunc) {
			if (!arguments.length) return mouseout;
			mouseout = mouseoutFunc;
			return timeline;
		};

		timeline.click = function (clickFunc) {
			if (!arguments.length) return click;
			click = clickFunc;
			return timeline;
		};

		timeline.scroll = function (scrollFunc) {
			if (!arguments.length) return scroll;
			scroll = scrollFunc;
			return timeline;
		};

		timeline.colors = function (colorFormat) {
			if (!arguments.length) return colorCycle;
			colorCycle = colorFormat;
			return timeline;
		};

		timeline.beginning = function (b) {
			if (!arguments.length) return beginning;
			beginning = b;
			return timeline;
		};

		timeline.ending = function (e) {
			if (!arguments.length) return ending;
			ending = e;
			return timeline;
		};

		timeline.labelMargin = function (m) {
			if (!arguments.length) return labelMargin;
			labelMargin = m;
			return timeline;
		};

    timeline.labelFloat = function (f) {
      if (!arguments.length) return labelFloat;
      labelFloat = f;
      return timeline;
    };

		timeline.rotateTicks = function (degrees) {
			if (!arguments.length) return rotateTicks;
			rotateTicks = degrees;
			return timeline;
		};

		timeline.stack = function () {
			stacked = !stacked;
			return timeline;
		};

		timeline.relativeTime = function() {
			timeIsRelative = !timeIsRelative;
			return timeline;
		};

		timeline.linearTime = function() {
			timeIsLinear = !timeIsLinear;
			return timeline;
		};

		timeline.showBorderLine = function () {
			showBorderLine = !showBorderLine;
			return timeline;
		};

		timeline.showBorderFormat = function(borderFormat) {
			if (!arguments.length) return showBorderFormat;
			showBorderFormat = borderFormat;
			return timeline;
		};

		timeline.showToday = function () {
			showTodayLine = !showTodayLine;
			return timeline;
		};

		timeline.showTodayFormat = function(todayFormat) {
			if (!arguments.length) return showTodayFormat;
			showTodayFormat = todayFormat;
			return timeline;
		};

		timeline.colorProperty = function(colorProp) {
			if (!arguments.length) return colorPropertyName;
			colorPropertyName = colorProp;
			return timeline;
		};

		timeline.rowSeparators = function (color) {
			if (!arguments.length) return rowSeparatorsColor;
			rowSeparatorsColor = color;
			return timeline;

		};

		timeline.background = function (color) {
			if (!arguments.length) return backgroundColor;
			backgroundColor = color;
			return timeline;
		};

		timeline.showTimeAxis = function () {
			showTimeAxis = !showTimeAxis;
			return timeline;
		};

		timeline.showAxisTop = function () {
			showAxisTop = !showAxisTop;
			return timeline;
		};

		timeline.showAxisCalendarYear = function () {
			showAxisCalendarYear = !showAxisCalendarYear;
			return timeline;
		};

		timeline.showTimeAxisTick = function () {
			timeAxisTick = !timeAxisTick;
			return timeline;
		};

		timeline.fullLengthBackgrounds = function () {
			fullLengthBackgrounds = !fullLengthBackgrounds;
			return timeline;
		};

		timeline.showTimeAxisTickFormat = function(format) {
			if (!arguments.length) return timeAxisTickFormat;
			timeAxisTickFormat = format;
			return timeline;
		};

		timeline.showAxisHeaderBackground = function(bgColor) {
			showAxisHeaderBackground = !showAxisHeaderBackground;
			if(bgColor) { (axisBgColor = bgColor); }
			return timeline;
		};

		timeline.navigate = function (navigateBackwards, navigateForwards) {
			if (!arguments.length) return [navigateLeft, navigateRight];
			navigateLeft = navigateBackwards;
			navigateRight = navigateForwards;
			showAxisNav = !showAxisNav;
			return timeline;
		};

		timeline.version = function() {
			return "1.0.0";
		};

		return timeline;
};

export default timeline;
