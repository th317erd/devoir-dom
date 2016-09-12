'use strict';

/**
* Virtual DOM
*
* @parentNode devoir-web
* @class data
* @static
*/

(function(factory) {
	module.exports = function(D) {
		if (!D.dom)
			D.dom = {};

		return factory(D.dom, D, D.events);
	};
})(function(root, D, events) {
	var p;

	function addRWMonitoredProperty(self, name, initalValue, setter, getter, _hiddenName) {
		var hiddenName = _hiddenName || ('_' + name);
		D.setRWProperty(self, hiddenName, initalValue);
		D.setRWProperty(self, name, undefined, setter || function(set) {
			var old = this[hiddenName];
			this[hiddenName] = set;

			if (!self.parentNode)
				return;
			
			self.handleUpdate.call(self, 'propertyChange', {
				name: name,
				node: self,
				value: set,
				oldValue: old,
				origin: self
			});
		}, getter || function() {
			return this[hiddenName];
		});
	}

	function updateNodeIndices(_offset) {
		var items = this.items,
				offset = _offset || 0;

		for (var i = offset, len = items.length; i < len; i++) {
			var node = items[i];
			node._nodeIndex = i;
			this[i] = node;
		}

		for (var i = items.length, len = this.length; i < len; i++)
			delete this[i];

		this.length = items.length;
	}
	
	function NodeList(nodes) {
		var self = this;

		events.EventEmitter.call(this, {defaultGroup: 'DOMEvent'});

		this.items = (nodes) ? nodes.slice() : [];
		D.setRWProperty(this, 'length', this.items.length);

		if (this.items.length > 0)
			updateNodeIndices.call(this);
	}

	p = NodeList.prototype = D.data.extend(Object.create(events.EventEmitter.prototype), {
		item: function(index) {
			var item = this.items[index];
			return (!item) ? null : item;
		}
	});
	p.constructor = NodeList;
	root.NodeList = NodeList; 

	function LiveNodeList(parentNodeNode) {
		NodeList.call(this);

		var self = this;

		this.parentNode = parentNodeNode;

		if (!this.hasOwnProperty('document')) {
			D.setROProperty(this, 'document', null, undefined, function() {
				return this.parentNode.document;
			});	
		}

		if (!this.hasOwnProperty('_eventPostfix'))
			D.setROProperty(this, '_eventPostfix', 'Child');
		
		if (!this.hasOwnProperty('_parentNodeNodeKey'))
			D.setROProperty(this, '_parentNodeNodeKey', 'parentNode');

		if (!this.hasOwnProperty('handleUpdate')) {
			var eventPostfix = this['_eventPostfix'];
			D.setROProperty(this, 'handleUpdate', function(name, opts) {
				var parentNode = self.parentNode;

				if (!parentNode)
					return;

				parentNode.handleUpdate.call(parentNode, name + eventPostfix, opts);
			});
		}
	}

	p = LiveNodeList.prototype = D.data.extend(Object.create(NodeList.prototype), {
		replace: function(node, ofNode) {
			if (!(ofNode instanceof Node))
				return;

			var items = this.items,
					relIndex = items.indexOf(ofNode);
			
			if (relIndex < 0)
				return;

			var parentNodeNodeKey = this['_parentNodeNodeKey'];
			ofNode[parentNodeNodeKey] = null;
			ofNode._document = this.document; //Set to document owning this list
			node[parentNodeNodeKey] = this.parentNode;
			node._document = null; //Set to null so document will be "found"
			node._nodeIndex = relIndex;
			items[relIndex] = node;

			this.handleUpdate('replace', {
				node: node,
				nodeIndex: relIndex,
				relNode: ofNode,
				relNodeIndex: relIndex,
				origin: this
			});
		},
		remove: function(node) {
			if (!(node instanceof Node))
				return;

			var items = this.items,
					relIndex = items.indexOf(node);
			
			if (relIndex < 0)
				return;

			var parentNodeNodeKey = this['_parentNodeNodeKey'];
			node[parentNodeNodeKey] = null;
			node._document = this.document; //Set to document owning this list
			items.splice(relIndex, 1);
			
			updateNodeIndices.call(this, relIndex);

			this.handleUpdate('remove', {
				node: node,
				nodeIndex: relIndex,
				relNode: null,
				relNodeIndex: -1,
				origin: this
			});
		},
		insert: function(node, ofNode) {
			if (!(ofNode instanceof Node))
				return;

			var items = this.items,
					relIndex = items.indexOf(ofNode);
			
			if (relIndex < 0)
				return;

			var parentNodeNodeKey = this['_parentNodeNodeKey'];
			node[parentNodeNodeKey] = this.parentNode;
			node._document = null; //Set to null so document will be "found"
			items.splice(relIndex, 0, node);
			
			updateNodeIndices.call(this, relIndex);

			this.handleUpdate('insert', {
				node: node,
				nodeIndex: relIndex,
				relNode: ofNode,
				relNodeIndex: relIndex + 1,
				origin: this
			});
		},
		append: function(node) {
			var items = this.items;

			if (!(node instanceof Node))
				return;

			var parentNodeNodeKey = this['_parentNodeNodeKey'];
			node[parentNodeNodeKey] = this.parentNode;
			node._document = null; //Set to null so document will be "found"
			items.push(node);
			
			updateNodeIndices.call(this, items.length - 1);

			this.handleUpdate('append', {
				node: node,
				nodeIndex: items.length - 1,
				relNode: null,
				relNodeIndex: -1,
				origin: this
			});
		},
		indexOf: function() {
			return this.items.indexOf.apply(this.items, arguments);
		},
		first: function() {
			var item = this.items[0];
			return (!item) ? null : item;
		},
		last: function() {
			var item = this.items[this.items.length - 1];
			return (!item) ? null : item;
		},
		getByName: function(name) {
			var items = this.items;

			for (var i = 0, len = items.length; i < len; i++) {
				var node = items[i];
				if (node.nodeName === name)
					return node;
			}

			return null;
		}
	});
	p.constructor = LiveNodeList;
	root.LiveNodeList = LiveNodeList; 

	function AttributeList(parentNodeNode) {
		if (!this.hasOwnProperty('_eventPostfix'))
			D.setROProperty(this, '_eventPostfix', 'Attribute');
		
		if (!this.hasOwnProperty('_parentNodeNodeKey'))
			D.setROProperty(this, '_parentNodeNodeKey', 'ownerNode');

		LiveNodeList.apply(this, arguments);
	}

	p = AttributeList.prototype = LiveNodeList.prototype;
	p.constructor = AttributeList;
	root.AttributeList = AttributeList; 

	function Window() {
		D.prop(this, 'define');
		events.EventEmitter.call(this, {defaultGroup: 'Window'});
	}

	p = Window.prototype = {};
	p.constructor = Window;
	root.Window = Window; 

	function cleanNode(node) {
		node.nodeName = null;
		node.nodeValue = null;
		node.outerValue = null;
		node.document = null;
		node.parentNode = null;
		node.ownerNode = null;
	}

	function getClasses(classStr, asArray) {
		var classList = (asArray) ? [] : {};
		if (!classStr)
			return;

		if (!((classes instanceof String) || typeof classes !== 'string'))
				return;

		var classes = classStr.split(/\s+/g);
		if (asArray)
			return classes;

		for (var i = 0, len = classes.length; i < len; i++) {
			var className = classes[i];
			classList[className] = className;
		}

		return classList;
	}

	function getClassList(asArray, _classList) {
		if (_classList)
			return _classList;

		var classList = {},
				classAttr = this._parentNode.getAttribute('class');

		if (!classAttr)
			return;

		return getClasses(classAttr.nodeValue, asArray);
	}

	function classListToString(classList) {
		var keys = Object.keys(classList),
				finalClasses = [];

		for (var i = 0, len = keys.length; i < len; i++) {
			var className = classList[keys[i]];
			if (!className)
				continue;

			finalClasses.push(className);
		}

		return finalClasses.join(' ');
	}

	function ClassList(ownerNode) {
		D.setROProperty(this, '_parentNode', ownerNode);
	}

	p = ClassList.prototype = D.data.extend(Object.create(events.EventEmitter.prototype), {
		contains: function(className, _classList) {
			var classList = getClassList.call(this, false, _classList);
			if (!classList)
				return;

			return (classList.hasOwnProperty(className));
		},
		add: function(_classes, _classList) {
			var classList = getClassList.call(this, false, _classList),
					classes = getClasses(_classes, true);

			if (!classes)
				return;

			for (var i = 0, len = keys.length; i < len; i++) {
				var className = classes[i];
				classList[className] = className;
			}

			this._parentNode.setAttribute('class', classListToString(classList));
		},
		remove: function(_classes, _classList) {
			var classList = getClassList.call(this, true, _classList),
					classes = _classes;

			if ((classes instanceof String) || typeof classes === 'string')
				classes = getClasses(classes, true);

			if (!classes)
				return;

			var finalClasses = [];
			for (var i = 0, il = classList.length; i < il; i++) {
				var className = classList[i];

				if (classes instanceof RegExp) {
					if (!classes.exec(className))
						finalClasses.push(className);
				} else if (classes instanceof Function) {
					if (!classes(className))
						finalClasses.push(className);
				} else {
					if (classes.indexOf(className) < 0)
						finalClasses.push(className);
				}
			}	

			this._parentNode.setAttribute('class', finalClasses.join(' '));
		},
		toggle: function(_classes, _on) {
			var classList = getClassList.call(this, false),
					classes = getClasses(_classes, true),
					on = !!_on,
					argLen = arguments.length;

			if (!classes)
				return;

			for (var i = 0, il = classes.length; i < il; i++) {
				var className = classes[i],
						toggle = (argLen === 1) ? !classList.hasOwnProperty(className) : on;

				if (toggle)
					classList[className] = className;
				else if (!toggle)
					classList[className] = false;
			}

			this._parentNode.setAttribute('class', classListToString(classList));
		},
		toString: function() {
			var classList = getClassList.call(this, true);
			if (!classList)
				return '';
			return classList.join(' ');
		},
		valueOf: function() {
			var classList = getClassList.call(this, true);
			if (!classList)
				return [];
			return classList;
		}
	});

	function convertAttributesToString(attributes) {
		var parts = [];
		if (attributes.length > 0) {
			var attr = [];

			for (var i = 0, len = attributes.length; i < len; i++) {
				var thisAttr = (attributes instanceof AttributeList) ? attributes.item(i): attributes[i],
						val = thisAttr.nodeValue;

				if (val)
					val = ('' + val).replace(/"/g, '\\"');
				else
					val = '';

				attr.push(thisAttr.nodeName + '="' + val + '"');
			}

			parts.push(attr.join(' '));
		}

		return parts.join('');
	}

	root.convertAttributesToString = convertAttributesToString;

	function convertNodeToString(node, onlyChildren, filterByType) {
		function buildBeginTag(node) {
			var parts = [];

			parts.push('<');
			parts.push(node.nodeName);

			var attrStr = root.convertAttributesToString.call(node, node.attributes);
			if (attrStr) {
				parts.push(' ');
				parts.push(attrStr);
			}

			parts.push('>');

			return parts.join('');
		}

		var parts = [];

		if (!onlyChildren) {
			if (!filterByType || (filterByType === Node.prototype.ELEMENT_NODE))
				parts.push(buildBeginTag(node));
		}

		if (node.childNodes && node.childNodes.length > 0) {
			var nodes = node.childNodes;
			for (var i = 0, len = nodes.length; i < len; i++) {
				var thisNode = nodes.item(i);

				if (thisNode.nodeType === Node.prototype.COMMENT_NODE)
					continue;

				if (thisNode.nodeType === Node.prototype.TEXT_NODE) {
					if (filterByType && filterByType !== Node.prototype.TEXT_NODE)
						continue;
					parts.push(thisNode.data);
				} else {
					if (filterByType && filterByType === Node.prototype.TEXT_NODE && ('' + thisNode.nodeName).match(/(script|style)/i))
						continue;
					parts.push(root.convertNodeToString(thisNode, false, filterByType));
				}
			}
		}

		if (!onlyChildren) {
			if (!filterByType || (filterByType === Node.prototype.ELEMENT_NODE)) {
				parts.push('</');
				parts.push(node.nodeName);
				parts.push('>');		
			}
		}

		return parts.join('');
	}

	root.convertNodeToString = convertNodeToString;

	function Node(ownerNodeDocument) {
		var self = this;

		D.prop(this, 'define');
		events.EventEmitter.call(this, {defaultGroup: 'DOMEvent'});

		D.setROProperty(this, 'uid', D.prop(this, 'getID'));
		D.setRWProperty(this, '_nodeIndex', -1);

		addRWMonitoredProperty(this, 'nodeName', null);
		//addRWMonitoredProperty(this, 'nodeValue', null);
		//addRWMonitoredProperty(this, 'outerValue', null);

		addRWMonitoredProperty(this, 'document', ownerNodeDocument, undefined, function() {
			if (this instanceof Document)
				return this;

			var parentNode = this.parentNode;
			if (parentNode)
				return this.parentNode.document;

			if (this._document instanceof Document)
				return this._document;
			
			return null;
		});

		addRWMonitoredProperty(this, 'parentNode', null);
		addRWMonitoredProperty(this, 'ownerNode', null);

		D.setROProperty(this, 'firstChild', null, undefined, function() {
			if (!this.parentNode)
				return null;
			return this.parentNode.childNodes.first();
		});

		D.setROProperty(this, 'lastChild', null, undefined, function() {
			if (!this.parentNode)
				return null;
			return this.parentNode.childNodes.last();
		});

		D.setROProperty(this, 'nextSibling', null, undefined, function() {
			if (!this.parentNode)
				return null;

			if (this._nodeIndex < 0)
				return null;

			return this.parentNode.childNodes[this._nodeIndex + 1];
		});

		D.setROProperty(this, 'previousSibling', null, undefined, function() {
			if (!this.parentNode)
				return null;
			
			if (this._nodeIndex < 1)
				return null;

			return this.parentNode.childNodes[this._nodeIndex - 1];
		});

		D.setROProperty(this, 'childNodes', new root.LiveNodeList(this));
		D.setROProperty(this, 'attributes', new root.AttributeList(this));

		D.setRWProperty(this, 'handleUpdate', function(name, opts) {
			opts.origin = self;
			opts.type = name;

			self.emit(name, [opts]);

			var doc = self.document;
			if (doc) {
				var docHandleUpdate = doc.handleUpdate;
				if (docHandleUpdate)
					docHandleUpdate.call(doc, name, opts);

				doc.emit(name, [opts]);
			}
		});
	}

	p = Node.prototype = D.data.extend(Object.create(events.EventEmitter.prototype), {
		index: function() {
			return this._nodeIndex;
		},
		appendNode: function(node) {
			return this.childNodes.append(node);
		},
		insertNode: function(node, ofNode) {
			return this.childNodes.insert(node, ofNode);
		},
		replaceNode: function(node, ofNode) {
			return this.childNodes.replace(node, ofNode);
		},
		removeNode: function(node) {
			return this.childNodes.remove(node);
		},
		cloneNode: function() {
		},
		getAttribute: function(_name) {
			var name = _name;

			if (name instanceof Node)
				name = name.nodeName;

			var attr = this.attributes.getByName(name);
			return (attr) ? attr : null;
		},
		setAttribute: function(_name, _val) {
			var name = _name,
					val = _val;

			if (name instanceof Node) {
				val = name.nodeValue;
				name = name.nodeName;
			}

			var node = new root.Text();
			node.nodeName = name;
			node.nodeValue = val;

			var currentNode = this.attributes.getByName(name);
			if (!currentNode)
				this.attributes.append(node);
			else
				this.attributes.replace(node, currentNode);
		}
	});
	p.constructor = Node;
	root.Node = Node; 

	D.setROProperty(p, 'ELEMENT_NODE', 1);
	D.setROProperty(p, 'TEXT_NODE', 3);
	D.setROProperty(p, 'COMMENT_NODE', 8);
	D.setROProperty(p, 'DOCUMENT_NODE', 9);
	D.setROProperty(p, 'DOCUMENT_TYPE_NODE', 10);
	D.setROProperty(p, 'DOCUMENT_FRAGMENT_NODE', 11);

	function Element() {
		Node.apply(this, arguments);

		this.nodeName = 'div';
		D.setROProperty(this, 'classList', new ClassList(this));

		addRWMonitoredProperty(this, 'innerHTML', undefined, null, function() {
			return root.convertNodeToString(this, true);
		});

		addRWMonitoredProperty(this, 'innerText', undefined, null, function() {
			return root.convertNodeToString(this, true, Node.prototype.TEXT_NODE);
		});

		addRWMonitoredProperty(this, 'outerHTML', undefined, null, function() {
			return root.convertNodeToString(this, false);
		});
	}

	p = Element.prototype = Object.create(Node.prototype);
	p.constructor = Element;
	root.Element = Element;
	D.setROProperty(p, 'nodeType', Node.prototype.ELEMENT_NODE);

	function Text() {
		Node.apply(this, arguments);

		var self = this;
		addRWMonitoredProperty(this, 'data', null);
		addRWMonitoredProperty(this, 'textContent', null, function(set) {
			self.data = set;
		}, function() {
			return self.data;
		});
	}

	p = Text.prototype = Object.create(Node.prototype);
	p.constructor = Text;
	root.Text = Text;
	D.setROProperty(p, 'nodeType', Node.prototype.TEXT_NODE);

	function Comment() {
		Node.apply(this, arguments);

		var self = this;
		addRWMonitoredProperty(this, 'data', null);
		addRWMonitoredProperty(this, 'textContent', null, function(set) {
			self.data = set;
		}, function() {
			return self.data;
		});
	}

	p = Comment.prototype = Object.create(Node.prototype);
	p.constructor = Comment;
	root.Comment = Comment;
	D.setROProperty(p, 'nodeType', Node.prototype.COMMENT_NODE);

	function QueryEngine(fetchNodeEntries) {
		var self = this;
		
		self.tokenizeSelector = function(inputStr) {
			var tokenizer = new D.utils.Tokenizer({
		    skipWS: false,
		    tokenTypes: {
		      'Identifier': {
		        order: 1,
		        pattern: /[a-zA-Z]((?:[a-zA-Z0-9_-]|\\.)*)/g
		      },
		      'Numeric': null
		    }
		  });

		  tokenizer.parse(inputStr);
		  
		  return tokenizer;
		};

		self.buildComparator = function(tokenizer, _offset, asFilter) {
			function selectorError(tokens, offset, msg) {
				var msgStr = 'Error parsing selector:' + offset + ': ' + msg;
				throw new SyntaxError(msgStr);
			}

			function getSubSelector(tokens, offset) {
				var parenCount = 1,
						tokenArray = [],
						token = tokens[offset];

				if (token.type !== 'Punctuator' && token.type !== '(')
					selectorError('Expected "(", found "' + token.value + '"');

				for (var i = offset + 1, len = tokens.length; i < len; i++) {
					token = tokens[i];
					if (token.type === 'Punctuator' && token.value === '(') {
						parenCount++;
						continue;
					} else if (token.type === 'Punctuator' && token.value === ')') {
						parenCount--;

						if (parenCount === 0)
							break;

						continue;
					}

					if (parenCount === 1)
						tokenArray.push(token.value);
				}

				if (parenCount > 0)
					selectorError(tokens, offset, 'Unexpected end of input');

				return {
					value: tokenArray.join(''),
					offset: i
				};
			}

			function nodeEntryMatches(nodeEntry, selectors) {
				var document = this;

				for (var i = 0, iLen = selectors.length; i < iLen; i++) {
					var comparators = selectors[i],
							matched = true;

					for (var j = 0, jLen = comparators.length; j < jLen; j++) {
						var comparator = comparators[j],
								compare = comparator.compare;

						if (!(compare instanceof Function))
							continue;

						if (!compare.call(document, undefined, nodeEntry)) {
							matched = false;
							break;
						}
					}

					if (matched)
						return true;
				}

				return false;
			}

			var tokens = tokenizer.tokens,
					offset = _offset,
					compareFunc,
					getNodesFunc,
					type;

			if (offset >= tokens.length) {
				return {
					offset: offset + 1
				};
			}

			var token = tokens[offset];
			if (token.type === 'Punctuator' && token.value === '#') {
				offset = tokenizer.eatWhiteSpace(offset + 1);
				var id = tokens[offset++].value;
				
				getNodesFunc = function(nodeList) {
					return fetchNodeEntries.call(this, nodeList, 'attribute', 'id');
				};	
				
				compareFunc = function(nodeList, nodeEntry) {
					var idAttr = nodeEntry.attributeNode;
					if (!idAttr)
						idAttr = nodeEntry.node.getAttribute('id');

					if (!idAttr)
						return false;

					return (idAttr.nodeValue === id);
				};
			} else if (token.type === 'Punctuator' && token.value === '.') {
				offset = tokenizer.eatWhiteSpace(offset + 1);
				var className = tokens[offset++].value,
						classRE = new RegExp("(^|\\s)" + className + "($|\\s)");
				
				getNodesFunc = function(nodeList) {
					return fetchNodeEntries.call(this, nodeList, 'attribute', 'class');
				};
				
				compareFunc = function(nodeList, nodeEntry) {
					var classAttr = nodeEntry.attributeNode;
					if (!classAttr)
						classAttr = nodeEntry.node.getAttribute('class');

					if (!classAttr)
						return false;

					return (!!classAttr.nodeValue.match(classRE));
				};
			} else if (token.type === 'Punctuator' && token.value === '>') {
				//Eating the whitespace ensures the next selector is a filter (not a getter)
				offset = tokenizer.eatWhiteSpace(offset + 1);

				getNodesFunc = function(nodeList) {
					var allChildNodes = [];
					for (var i = 0, iLen = nodeList.length; i < iLen; i++) {
						var node = nodeList[i].node,
								childNodes = node.childNodes;

						for (var j = 0, jLen = childNodes.length; j < jLen; j++)
							allChildNodes.push({
								node: childNodes.item(j)
							});
					}

					return allChildNodes;
				};
			} else if (token.type === 'Punctuator' && token.value === ':') {
				offset++;
				var filterName = tokens[offset++].value,
						token = tokens[offset];

				switch(filterName) {
					case 'not': {
						if (token && token.type === 'Punctuator' && token.value === '(') {
							var ret = getSubSelector(tokens, offset),
									subSelector = ret.value;
							offset = ret.offset;

							var selectors = this.compileSelector(subSelector);
							getNodesFunc = function(nodeList) {
								if (nodeList.length === 0)
									return fetchNodeEntries.call(this, [], 'all');
								return nodeList;
							};

							compareFunc = function(nodeList, nodeEntry) {
								return !nodeEntryMatches(nodeEntry, selectors);
							};
						}

						break;
					}
				}
			} else if (tokens[offset].type === 'Identifier') {
				var elementName = tokens[offset++].value;

				if (!asFilter) {
					getNodesFunc = function(nodeList) {
						return fetchNodeEntries.call(this, nodeList, 'name', elementName);
					};	
				}

				compareFunc = function(nodeList, nodeEntry) {
					return (nodeEntry.node.nodeName === elementName);
				};	 
			} else {
				//Warning unknown or invalid selector
				offset++;
			}

			return {
				getNodeEntries: getNodesFunc,
				compare: compareFunc,
				offset: offset,
				type: type
			};
		};

		self.compileSelector = function(selectorStr) {
			var tokenizer = this.tokenizeSelector(selectorStr),
					tokens = tokenizer.tokens,
					selectors = [],
					comparators = [],
					offset;
			
			for (var i = tokenizer.eatWhiteSpace(0), len = tokens.length; i < len;) {
				var token = tokens[i], filter = true;
				if (token.type === 'Punctuator' && token.value === ',') {
					if (comparators.length > 0) {
						selectors.push(comparators);
						comparators = [];	
					}

					i = tokenizer.eatWhiteSpace(i + 1);
					continue;
				}

				if (token.type === 'WhiteSpace') {
					filter = false;
					i = tokenizer.eatWhiteSpace(i);
				}

				var ret = this.buildComparator(tokenizer, i, (comparators.length > 0) ? filter : false);
				i = ret.offset;

				comparators.push({
					getNodeEntries: ret.getNodeEntries,
					compare: ret.compare,
					type: ret.type
				});
			}

			if (comparators.length > 0)
				selectors.push(comparators);

			return selectors;
		};

		self.getMatchingNodes = function(selectors) {
			var document = this,
					finalNodeEntries = [];

			for (var i = 0, iLen = selectors.length; i < iLen; i++) {
				var comparators = selectors[i],
						currentNodes = [],
						lastParentNodes = [];

				for (var j = 0, jLen = comparators.length; j < jLen; j++) {
					var comparator = comparators[j],
							getNodeEntries = comparator.getNodeEntries,
							compare = comparator.compare,
							nodeEntries = lastParentNodes;

					if (getNodeEntries instanceof Function) {
						nodeEntries = getNodeEntries.call(document, lastParentNodes);
						if (!nodeEntries || nodeEntries.length === 0) {
							currentNodes = [];
							break;
						}	
					}

					for (var n = 0, nLen = nodeEntries.length; n < nLen; n++) {
						var nodeEntry = nodeEntries[n];
						if ((compare instanceof Function) && !compare.call(document, currentNodes, nodeEntry))
							continue;

						currentNodes.push(nodeEntry);
					}	

					lastParentNodes = currentNodes;
					currentNodes = [];
				}

				if (lastParentNodes.length > 0) {
					for (var n = 0, nLen = lastParentNodes.length; n < nLen; n++)
						finalNodeEntries.push(lastParentNodes[n]);
				}
			}

			return finalNodeEntries;
		};

		self.querySelectorAll = function(selectorStr) {
			var selectors = this.compileSelector(selectorStr);
			//console.log("These selectors: ", selectors);

			var finalNodeEntries = this.getMatchingNodes(selectors),
					finalNodes = [],
					sortMap = {};

			for (var i = 0, len = finalNodeEntries.length; i < len; i++) {
				var node = finalNodeEntries[i].node,
						sortKey = QueryEngine.prototype.getNodeDocumentOffset(node);

				finalNodes.push(node);
				sortMap[node.uid] = sortKey;
			}

			//Sort by document position
			finalNodes.sort(function(a,b) {
				var x = sortMap[a.uid], y = sortMap[b.uid];
				return (x == y) ? 0 : (x < y) ? -1 : 1;
			});

			return new root.NodeList(finalNodes);
		};

		self.querySelector = function(selectorStr) {
			var ret = this.querySelectorAll(selectorStr);
			return (ret instanceof Array) ? ret[0] : ret;
		};
	}
	p = QueryEngine.prototype = {
		getNodeDocumentOffset: function getNodeDocumentOffset(node, _totalOffset) {
			var totalOffset = (_totalOffset || '');

			if (!node.parentNode)
				return totalOffset;

			return QueryEngine.prototype.getNodeDocumentOffset(node.parentNode, node._nodeIndex + '.' + totalOffset);
		},
		filterByMatching: function filterByMatching(parentNodeEntries, nodeEntries) {
			var finalNodeEntries = [],
					parentNodeIDs = {};

			for (var i = 0, len = parentNodeEntries.length; i < len; i++) {
				var node = parentNodeEntries[i].node;
				parentNodeIDs[node.uid] = node;
			}

			for (var i = 0, len = nodeEntries.length; i < len; i++) {
				var nodeEntry = nodeEntries[i],
						node = nodeEntry.node;

				if (parentNodeIDs[node.uid])
					finalNodeEntries.push(nodeEntry);
			}

			return finalNodeEntries;
		},
		filterByHasParent: function filterByHasParent(parentNodeEntries, nodeEntries) {
			function hasParentNode(node, parentNodeIDs) {
				if (!node)
					return false;

				var parentNode = node.parentNode;
				if (!parentNode)
					return false;

				if (parentNodeIDs[parentNode.uid])
					return true;

				return hasParentNode(parentNode, parentNodeIDs);
			}

			var finalNodeEntries = [],
					parentNodeIDs = {};

			for (var i = 0, len = parentNodeEntries.length; i < len; i++) {
				var node = parentNodeEntries[i].node;
				parentNodeIDs[node.uid] = node;
			}

			for (var i = 0, len = nodeEntries.length; i < len; i++) {
				var nodeEntry = nodeEntries[i];
				if (hasParentNode(nodeEntry.node, parentNodeIDs))
					finalNodeEntries.push(nodeEntry);
			}

			return finalNodeEntries;
		}
	};
	p.constructor = QueryEngine;
	root.QueryEngine = QueryEngine;

	function NodeCollection(selector, _context) {
		function isArrayType(obj) {
			if (selector instanceof Array ||
				selector instanceof root.NodeCollection ||
				selector instanceof root.NodeList ||
				selector instanceof root.LiveNodeList ||
				(obj.length !== undefined && obj.length > 0))
					return true;
			return false;
		}

		Array.apply(this, []);
		QueryEngine.call(this);

		if (isArrayType(selector)) {
			for (var i = 0, len = selector.length; i < len; i++)
				this.push(selector[i]);
		} else if (selector instanceof root.Node) {
			this.push(Node);
		} else if (selector instanceof String || typeof selector === 'string') {
			var context = _context || global.document;
			var ret = (context.querySelectorAll) ? context.querySelectorAll(selector) : context.find(selector);
			if (isArrayType(ret)) {
				for (var i = 0, len = ret.length; i < len; i++)
					this.push(ret[i]);
			}
		}

		this.fetchNodeEntries = function(parentNodeEntries, property, value) {
			function getAllNodes(node, property, value, _nodeEntryArray) {
				var nodeEntryArray = _nodeEntryArray || [];
				var children = node.childNodes;

				for (var i = 0, len = children.length; i < len; i++) {
					var childNode = children[i];

					if ((property === 'name' && childNode.nodeName && childNode.nodeName.toLowerCase() === value) ||
							(property === 'uid' && childNode.uid === value) ||
							(property === 'attribute' && childNode.attributes && childNode.attributes.getByName(value))) {
						nodeEntryArray.push({
							node: childNode
						});	
					}

					if (childNode.childNodes.length > 0)
						getAllNodes(childNode, property, value, nodeEntryArray);
				}

				return nodeEntryArray;
			}

			var nodeEntries = [];
			for (var i = 0, len = this.length; i < len; i++) {
				var subEntries = getAllNodes(this[i], property, value);
				nodeEntries = nodeEntries.concat(subEntries);
			}
			
			if (property === 'all')
				return nodeEntries;

			if (parentNodeEntries && parentNodeEntries.length > 0) {
				if (property === 'attribute')
					return QueryEngine.prototype.filterByMatching.call(this, parentNodeEntries, nodeEntries);
				else if (property === 'name')
					return QueryEngine.prototype.filterByHasParent.call(this, parentNodeEntries, nodeEntries);
			}

			return nodeEntries;
		};

		QueryEngine.call(this, this.fetchNodeEntries.bind(this));
	}

	p = NodeCollection.prototype = Object.create(Array.prototype, {
		find: function(selectorStr) {

		},
		children: function(selectorStr) {

		}
	});
	p.constructor = NodeCollection;
	root.NodeCollection = NodeCollection;

	function Document() {
		Element.apply(this, arguments);

		D.setROProperty(this, '_nodeCache', {});
		var nodeCache = this._nodeCache;

		function hasNodeEntry(cacheArray, node) {
			for (var i = 0, len = cacheArray.length; i < len; i++)
				if (cacheArray[i].node === node)
					return i;
			return -1;
		}

		function cleanCache(node, property, value) {
			var properties = (property) ? [property] : ['name','uid','attribute'];
			
			//Find all instances of matching node and purge the node
			for (var i = 0, len = properties.length; i < len; i++) {
				var thisCache = nodeCache[properties[i]],
						keys = Object.keys(thisCache),
						purgeKeys = [];

				for (var k = 0, kLen = keys.length; k < kLen; k++) {
					var key = keys[k];

					//This cache entry doesn't match purge criteria
					if (value && key !== value)
						continue;

					var cacheArray = thisCache[key];
					if (!cacheArray) {
						purgeKeys.push(key);
						continue;
					}

					var cleanedArray = [];
					for (var v = 0, vLen = cacheArray.length; v < vLen; v++) {
						var cachedNode = cacheArray[v];
						if (cachedNode !== node)
							cleanedArray.push(cachedNode);
					}

					if (cleanedArray.length !== cacheArray.length)
						nodeCache[key] = cleanedArray;

					if (cleanedArray.length === 0)
						purgeKeys.push(key);
				}

				//Finally purge any cache entries that are empty
				for (var k = 0, kLen = purgeKeys.length; k < kLen; k++) {
					var key = purgeKeys[k];
					delete thisCache[key];
				}
			}
		}

		function addCacheEntry(property, value, node) {
			if (!value)
				return;

			var thisCache = nodeCache[property];
			if (!thisCache)
				thisCache = nodeCache[property] = {};

			var cacheArray = thisCache[value];
			if (!cacheArray)
				cacheArray = thisCache[value] = [];

			if (hasNodeEntry(cacheArray, node) > -1)
				return;

			var entry = {
				node: node
			};

			cacheArray.push(entry);

			return entry;
		}

		D.setRWProperty(this, 'handleUpdate', function(name, opts) {
			if (name === 'removeChild') {
				var node = opts.node;
				cleanCache(node);
			} else if (name === 'replaceChild') {
				var node = opts.node;
				cleanCache(opts.relNode);
			} else if (name === 'insertChild' || name === 'appendChild') {
				var node = opts.node;
				addCacheEntry('uid', node.uid, node);

				var nodeName = node.nodeName;
				if (nodeName)
					addCacheEntry('name', nodeName, node);
			} else if (name === 'removeAttribute') {
				var node = opts.origin;
				cleanCache(node, 'attribute', '=', opts.node.nodeName);
			} else if (name === 'insertAttribute' || name === 'appendAttribute') {
				var node = opts.origin;
				var entry = addCacheEntry('attribute', opts.node.nodeName, node);
				entry.attributeNode = opts.node;
			} else if (name === 'propertyChange') {
				var node = opts.origin;
				var propertyName = opts.name;
				if (propertyName === 'name') {
					var oldName = opts.oldValue;
					if (oldName)
						cleanCache(node, 'name', oldName);

					var nodeName = node.nodeName;
					if (nodeName)
						addCacheEntry('name', nodeName, node);
				} else if (propertyName === 'parentNode') {
					if (!opts.value)
						cleanCache(node);
				}
			}
		});

		this.fetchNodeEntries = function(parentNodeEntries, property, value) {
			if (property === 'all') {
				var thisCache = nodeCache['uid'],
						keys = Object.keys(thisCache),
						allEntries = [];

				for (var i = 0, len = keys.length; i < len; i++) {
					var key = keys[i],
							cacheArray = thisCache[key];

					allEntries = allEntries.concat(cacheArray);
				}

				return allEntries;
			}

			var thisCache = nodeCache[property];
			if (!thisCache)
				return [];

			var nodeEntries = thisCache[value];
			if (!nodeEntries)
				return [];

			if (parentNodeEntries && parentNodeEntries.length > 0) {
				if (property === 'attribute')
					return QueryEngine.prototype.filterByMatching.call(this, parentNodeEntries, nodeEntries);
				else if (property === 'name')
					return QueryEngine.prototype.filterByHasParent.call(this, parentNodeEntries, nodeEntries);
			}

			return nodeEntries;
		};

		QueryEngine.call(this, this.fetchNodeEntries.bind(this));
	}

	p = Document.prototype = Object.create(Node.prototype);
	p.constructor = Document;
	root.Document = Document;
	D.setROProperty(p, 'nodeType', Node.prototype.DOCUMENT_NODE);

	function parseDOM(inputStr, parentNodeElem, opts) {
		function rawTokenParserFactory(tagName, stringAware, doubleSlashCommentAware, blockCommentAware, regExpAware) {
			function parseRegExp(str, offset) {
				function getCharacterClass(str, index, chunks) {
					chunks.push('[');
					for (var i = index + 1, len = str.length; i < len;) {
						var c = str.charAt(i);
						if (c === '\\') {
							i++;
							chunks.push(str.charAt(i++));
							continue;
						}

						if (c === ']') {
							chunks.push(']');
							return i + 1;
						}

						chunks.push(c);
						i++;
					}
				}

				if (str.charAt(offset) !== '/')
					return null;

				var chunks = [], flags = [], match = new Array(3);
				for (var i = offset + 1, len = str.length; i < len;) {
					var c = str.charAt(i);
					if (c.match(/\n/))
						return null;

					if (c === '\\') {
						i++;
						chunks.push(str.charAt(i++));
						continue;
					} else if (c === '[') {
						i = getCharacterClass(str, i, chunks);
						if (i >= len)
							return null;
						continue;
					} else if (c === '/') {
						i++;
						break;	
					}

					chunks.push(c);
					i++;
				}

				if (i >= len)
					return null;

				for (;i < len;i++) {
					var c = str.charAt(i);
					if (c !== 'g' && c !== 'i' && c !== 'm')
						break;
					flags.push(c);
				}

				match[1] = chunks.join('');
				match[2] = flags.join('');
				match[0] = '/' + match[1] + '/' + match[2];
				
				match.index = offset;
				match.input = str;
				match.lastIndex = i;

				return match;
			}

			function parseString(str, offset) {
				var strStart = str.charAt(offset);
				if (strStart !== '\'' && strStart !== '"')
					return offset;

				var skipNext = false;
				for (var i = offset + 1, len = str.length; i < len; i++) {
					var c = str.charAt(i);

					if (skipNext) {
						skipNext = false;
						continue;
					}

					//Skip escaping a backslash
					if (c === '\\') {
						skipNext = true;
						continue;
					}

					if (c === strStart)
						return i;
				}

				return i;
			}

			function parseComment(str, offset) {
				if (str.charAt(offset) !== '/')
					return offset;

				var blockComment;

				if (doubleSlashCommentAware && str.charAt(offset + 1) === '/') {
					blockComment = false;
				} else if (blockCommentAware && str.charAt(offset + 1) === '*') {
					blockComment = true;
				} else {
					return offset;
				}

				for (var i = offset + 2, len = str.length; i < len; i++) {
					var c = str.charAt(i), one = str.charAt(i + 1);

					if (blockComment && c === '*' && one === '/')
						return i + 1;
					else if (blockComment === false && c.match(/\n/))
						return i;
				}

				return i;
			}

			var commentAware = (doubleSlashCommentAware || blockCommentAware);
			return function(input, offset) {
				if (!this.parentTagName)
					return;

				var startRE = new RegExp('^' + tagName + '$','ig'), match;
				match = startRE.exec(this.parentTagName);
      	if (!match || match.index !== 0)
      		return;

      	var tagStartOffset = offset,
      			tagEndOffset,
      			endRE = new RegExp('<\\s*/' + tagName + '\\s*>', 'ig'),
      			actualTagName,
      			previousNonWhiteSpaceToken,
      			currentToken;

      	for (var i = offset, len = input.length; i < len; i++) {
      		var c = input.charAt(i);

      		if (!c.match(/[a-zA-Z0-9$]/)) {
      			previousNonWhiteSpaceToken = currentToken;
      			currentToken = c;
      		} else if (!c.match(/[\s\n]/))
      			currentToken += c;

      		if (stringAware && c === '\'' || c === '"') {
      			i = parseString(input, i);
      			continue;
      		} else if (regExpAware && c === '/' && (previousNonWhiteSpaceToken === '(' || previousNonWhiteSpaceToken === '=' || previousNonWhiteSpaceToken === ',' || previousNonWhiteSpaceToken === ':' || previousNonWhiteSpaceToken === 'return')) {
      			var match = parseRegExp(input, i);
      			if (match && match.index === i) {
      				i = match.lastIndex - 1;
      				continue;
      			}
      		} else if (commentAware && c === '/') {
      			i = parseComment(input, i)
      			continue;
      		} 

      		if (c !== '<')
      			continue;

      		endRE.lastIndex = i;
					match = endRE.exec(input);
					if (match && match.index === i) {
						actualTagName = match[1] || match[0];
						tagEndOffset = i;
						break;
					}
      	}

      	return [input.substring(offset, i), input.substring(tagStartOffset, tagEndOffset), actualTagName];
      };
		}

	  var tokenizer = new D.utils.Tokenizer({
	    skipWS: false,
	    tokenTypes: {
	    	'TagStart': {
	    		order: 1,
	    		pattern: function(input, offset) {
	    			var startRE = /<\s*\w/g;
	    			startRE.lastIndex = offset;
	    			var match = startRE.exec(input);

	    			if (match && match.index === offset) {
	    				var thisTokenizer = new D.utils.Tokenizer({
	    					skipWS: true,
	    					tokenTypes: {
	    						'TagEnd': {
	    							order: 1,
	    							pattern: />/g,
	    							success: function() {
	    								return this.abort();
	    							}
	    						},
	    						'Identifier': {
						        order: 10,
						        pattern: /([a-zA-Z][a-zA-Z0-9_:-]*)/g
						      }
	    					}
	    				});

	    				thisTokenizer.parse(input, offset + 1);
	    				var tokens = thisTokenizer.tokens;

	    				if (!tokens || tokens.length === 0)
	    					return;

	    				var nodeName,
	    						attributes = [],
	    						attr = {name: null, value: null},
	    						metaNode = (tokens[0].type === 'Punctuator' && tokens[0].value === '!'),
	    						selfClosing = false;

	    				for (var i = 0, len = tokens.length; i < len; i++) {
	    					var token = tokens[i];

	    					if (token.type === 'Punctuator' && token.value === '/') {
	    						selfClosing = true;
	    						continue;
	    					}

	    					if (!nodeName && token.type === 'Identifier') {
	    						nodeName = token.value;
	    						continue;
	    					}

	    					if (token.type === 'Identifier') {
	    						if (!attr.name) {
	    							attr.name = token.value;
	    							token = tokens[++i];
	    							if (token.type === 'Punctuator' && token.value === '=') {
	    								token = tokens[++i];
	    								attr.value = token.value;
	    								attributes.push(attr);
	    								attr = {name: null, value: null};
	    								continue;
	    							} else if (token.type === 'Identifier') {
	    								attr.value = attr.name;
	    								attributes.push(attr);
	    								attr = {name: null, value: null};
	    							}
	    						} else {
	    							attr.value = attr.name;
    								attributes.push(attr);
    								attr = {name: token.value, value: null};
	    						}
	    					}
	    				}

	    				return [input.substring(offset, thisTokenizer.offset + 1), nodeName, attributes, metaNode, selfClosing];
	    			}
	    		},
	    		success: function(match, nodeName, attributes, metaNode, selfClosing) {
	    			if (!this.tags)
	    				this.tags = [];
	    			this.tags.push(nodeName);
	    			this.parentTagName = nodeName;

	    			return {
    					name: nodeName,
    					value: nodeName,
    					attributes: attributes,
    					metaNode: metaNode,
    					selfClosing: selfClosing
    				};
	    		}
	    	},
	    	'TagEnd': {
	    		order: 2,
	    		pattern: /<\s*\/([a-zA-Z][a-zA-Z0-9_:-]*)>/g,
	    		success: function(match, nodeName) {
	    			if (this.tags) {
	    				this.tags.pop();
	    				this.parentTagName = this.tags[this.tags.length - 1];
	    			}

	    			return {
	    				name: nodeName
	    			};
	    		}
	    	},
	    	'Script': {
	        order: 3,
	        pattern: rawTokenParserFactory('(script)', true, true, true, true),
	        success: function(val, rawVal) {
	        	return {
	        		value: rawVal	
	        	};
	        }
	      },
	      'Style': {
	        order: 4,
	        pattern: rawTokenParserFactory('(style)', true, false, true, false),
	        success: function(val, rawVal, thisTagName) {
	        	return {
	        		value: rawVal	
	        	};
	        }
	      },
	      'RawTag': {
	        order: 5,
	        pattern: rawTokenParserFactory('(textarea|pre)', false, false, false, false),
	        success: function(val, rawVal, thisTagName) {
	        	return {
	        		value: rawVal	
	        	};
	        }
	      },
	      'RawText': {
	      	order: 9,
	        pattern: /[^<]+/g
	      },
	      'Identifier': {
	        order: 10,
	        pattern: /([a-zA-Z][a-zA-Z0-9_:-]*)/g
	      },
	      'Comment': {
	      	order: 25,
	        pattern: function(input, offset) {
	        	var re = /<!--[\s\S]*?-->/g;

						re.lastIndex = offset;
						var match = re.exec(input);
						if (!match || match.index !== offset)
							return;

						return match;
	        },
	        success: function(val, rawVal) {
	        	this.value = rawVal;
	        }
	      }
	    },
	    
	  }), Doc = new root.DocumentParser(D.data.extend({
	  	tokenizer: tokenizer
	  }, opts));

	  var thisElem = (parentNodeElem) ? cleanNode(parentNodeElem) : new root.Document(),
	  		ret = Doc.parse(inputStr, thisElem);

	  return ret.node;
	}

	p.createElement = function(name) {
		var node = new Element(this);
		node.nodeName = name;

		if (node.nodeName.match(/(input|textarea|select)/i)) {
			addRWMonitoredProperty(node, 'value', null, null, null, '_nodeValue');
			addRWMonitoredProperty(node, 'checked', undefined);
			addRWMonitoredProperty(node, 'disabled', undefined);
		}

		return node;
	};

	p.createTextNode = function() {
		var node = new Text(this);
		return node;
	};

	p.createComment = function() {
		var node = new Comment(this);
		return node;
	};

	p.createDocumentFragment = function() {
		var node = new DocumentFragment(this);
		return node;
	};

	p.parse = function(inputStr, opts) {
		return parseDOM(inputStr, this, opts);
	};

	Document.parse = function(inputStr, opts) {
		return parseDOM(inputStr, null, opts);
	};

	function DocumentType() {
		Node.apply(this, arguments);
	}

	p = DocumentType.prototype = Object.create(Node.prototype);
	p.constructor = DocumentType;
	root.DocumentType = DocumentType;
	D.setROProperty(p, 'nodeType', Node.prototype.DOCUMENT_TYPE_NODE);

	function DocumentFragment() {
		Node.apply(this, arguments);
	}

	p = DocumentFragment.prototype = Object.create(Node.prototype);
	p.constructor = DocumentFragment;
	root.DocumentFragment = DocumentFragment;
	D.setROProperty(p, 'nodeType', Node.prototype.DOCUMENT_FRAGMENT_NODE);

	function DocumentParser(opts) {
		this.options = D.data.extend(true, {
			tokenizer: null
		}, opts);
	}

	p = DocumentParser.prototype = {
	  getDebugInfo: function(context, tokenizer, offset) {
			var rawStr = tokenizer.input.substring(0, offset),
					lines = rawStr.match(/\n/g),
					lineNum = (lines) ? (lines.length + 1) : 1,
					colPart = rawStr.match(/[^\n]*$/),
					colNum = (colPart) ? ((rawStr.length - colPart.index) + 1) : 1,
					fileName = context.fileName || "<anonymous>";

			return {
				file: fileName,
				line: lineNum,
				column: colNum,
				extraInfo: (colPart) ? colPart[0] : ''
			};
		},
		reportError: function(context, tokenizer, offset, msg) {
			var info = this.getDebugInfo(context, tokenizer, offset);
			console.error("Error: " + info.file + ":" + info.line + ":" + info.column + ": " + msg);
			if (info.extraInfo)
				console.error("---> " + info.extraInfo);
		},
		reportWarning: function(context, tokenizer, offset, msg) {
			var info = this.getDebugInfo(context, tokenizer, offset);
			console.warn("Warning: " + info.file + ":" + info.line + ":" + info.column + ": " + msg);
			if (info.extraInfo)
				console.warn("---> " + info.extraInfo);
		},
		isTagSelfClosing: function(tagName) {
			return !!('' + tagName).match(/^(area|base|br|col|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/);
		},
	  parseNode: function(context, tokenizer, parentNode, tokens, offset) {
	  	var ownerDocument = context.ownerDocument;

	  	for (var i = offset, il = tokens.length; i < il; i++) {
	  		var token = tokens[i];
		  	if (token.type === 'TagStart') {
		  		var isDocType = (token.metaNode && token.name.toLowerCase() === 'doctype'),
		  				node = (isDocType) ? new DocumentType() : ownerDocument.createElement(token.name);

		  		if (isDocType) {
		  			var docType = token.attributes[0].name;
		  			context.docType = docType;
		  			ownerDocument.doctype = node;
		  			return parentNode;
		  		}

		  		var attributes = token.attributes;
		  		if (attributes && attributes.length > 0) {
		  			for (var j = 0, jl = attributes.length; j < jl; j++) {
		  				var attr = attributes[j];
		  				node.setAttribute(attr.name, attr.value);
			  		}
		  		}

		  		parentNode.appendNode(node);

		  		if (token.selfClosed)
		  			this.reportWarning(context, tokenizer, token.offset, "Invalid HTML5 to self-close a tag with /");

		  		if (!this.isTagSelfClosing(node.nodeName))
		  			i = this.parseNode(context, tokenizer, node, tokens, i + 1);
		  	} else if (token.type === 'TagEnd') {
		  		if (token.name.toLowerCase() !== parentNode.nodeName.toLowerCase())
		  			this.reportWarning(context, tokenizer, token.offset, "Expected closing tag for " + parentNode.nodeName + ' but found closing tag ' + token.name);
		  		return i;
		  	} else if (token.type === 'Comment') {
		  		var node = ownerDocument.createComment();
		  		node.data = token.value;
		  		parentNode.appendNode(node);
		  	} else if (	token.type === 'Script' ||
		  							token.type === 'Style' ||
		  							token.type === 'RawText' ||
		  							token.type === 'RawTag') {
		  		var node = ownerDocument.createTextNode();
		  		node.data = token.value;
		  		parentNode.appendNode(node);
		  	}
		  }

	  	return i;
	  },
		parse: function parse(inputStr, _parentNodeElem) {
			var parentNodeElem = _parentNodeElem;
			if (!parentNodeElem)
				parentNodeElem = new Document();

  		var tokens = this.options.tokenizer.parse(inputStr),
	  			context = {
	  				docType: 'html',
	  				ownerDocument: parentNodeElem.document,
	  				fileName: this.options.fileName
	  			};

	  	this.parseNode(context, this.options.tokenizer, parentNodeElem, tokens, 0);

  		return {
  			context: context,
  			tokens: tokens,
  			node: parentNodeElem
  		};
	  }
	};
	p.constructor = DocumentParser;
	root.DocumentParser = DocumentParser;

	function debugNode(node, _depth) {
		function tabs(depth) {
			if (depth < 1)
				return '';

			var len = depth * 2, parts = [];
			for (var i = 0; i < len; i++) {
				if (!(i % 2))
					parts.push('│');
				else
					parts.push(' ');
			}

			return parts.join('');
		}

		function logNode(node, end, selfClosing, depth) {
			if (!node.nodeName) {
				console.log(tabs(depth) + '<--->');
				return;
			}

			console.log(tabs(depth) + '<' + ((end) ? '/' : '') + node.nodeName + ((selfClosing) ? '/' : '') + '>');
		}

		var depth = _depth || 0,
				children = node.childNodes;

		logNode(node, false, false, depth);
		for (var i = 0, len = children.length; i < len; i++) {
			var childNode = children[i];
			if (childNode.childNodes.length > 0) {
				debugNode(childNode, depth + 1);
			} else {
				if (!childNode.nodeName)
					logNode(childNode, false, false, depth + 1);
				else
					logNode(childNode, false, true, depth + 1);
			}
		}

		logNode(node, true, false, depth);
	};

	root.debugNode = debugNode;

	return root;
});