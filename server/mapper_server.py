#!/usr/bin/python3

import socket
from http.server import BaseHTTPRequestHandler, HTTPServer
import time

import threading

import dataset

import json

HOST_NAME = "localhost"
HOST_PORT = 60381

class RequestHandler(BaseHTTPRequestHandler):

	def do_POST(self):
		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length).decode('utf-8') # <--- Gets the data itself

		self.send_response(200)
		self.send_header('Content-type','application/json')
		self.send_header('Access-Control-Allow-Origin', '*')
		self.end_headers()

		if self.path == '/check':
			self.checkLink(post_data)			
		elif self.path == '/load':
			self.loadLink(post_data)
		elif self.path == '/save':
			post_data = json.loads(post_data)
			self.saveLink(post_data['url'], post_data['title'], post_data['icon'], post_data['tags'])
		elif self.path == '/remove':
			self.removeLink(post_data)
		elif self.path == '/tagList':
			self.tagList()
		elif self.path == '/getTree':
			self.loadTree()
		elif self.path == '/loadTag':
			self.loadTag(post_data)
		elif self.path == '/updateTag':
			post_data = json.loads(post_data)
			self.updateTag(post_data['tag'], post_data['parent'])
		elif self.path == '/deleteTag':
			self.deleteTag(post_data)

	def checkLink(self, link):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			faved = tx['links'].find_one(url=link) is not None
			self.wfile.write( json.dumps({'faved':faved}).encode("utf-8") )

	def loadLink(self, link):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			record = tx['links'].find_one(url=link)
			if record:
				tags = tx['tags'].find(url=record['id'])
				tags = [el['tag'] for el in tags]
				self.wfile.write( json.dumps(
					{'faved':'true', 'tags':tags}
						).encode("utf-8") )
			else:
				self.wfile.write( json.dumps({'faved':'false'}).encode("utf-8") )

	def saveLink(self, link, title, icon, tags):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			key = tx['links'].insert(dict(url=link, title=title, icon=icon))
			for tag in tags:
				# check if tag is in tree
				if tx['tree'].find_one(tag=tag) is None:
					tx['tree'].insert(dict(tag=tag, parent='Top Level'))
				tx['tags'].insert(dict(tag=tag, url=key))

	def removeLink(self, link):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			key = tx['links'].find_one(url=link)
			if key is None:
				print('no such link in base')
				return

			key = key['id']

			tx['tags'].delete(url=key)
			tx['links'].delete(id=key)

	def tagList(self):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			tags = [el['tag'] for el in tx['tree'].distinct('tag')]
			self.wfile.write( json.dumps({'tags':tags}).encode("utf-8") )

	def loadTree(self):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			tree = [{'name':node['tag'], 'parent':node['parent']} for node in tx['tree'].all()]
			self.wfile.write( json.dumps(tree).encode("utf-8") )

	def loadTag(self, tag):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			if tag == "Top Level":
				links = [dict(record) for record in tx['links'].all()]
			else:
				records = tx['tags'].find(tag=tag)
				if records is not None:
					links = [dict( tx['links'].find_one(id=record['url']) ) for record in records]
			try:
				self.wfile.write( json.dumps(links).encode("utf-8") )
			except:
				self.wfile.write( json.dumps([]).encode("utf-8") )

	def addTag(self, tag, parent='Top Level'):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			tx['tree'].insert(dict(tag=tag, parent=parent))

	def updateTag(self, tag, parent):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			if parent=='Top Level':
				tx['tree'].update(dict(tag=tag, parent='Top Level'), ['tag'])
			elif tx['tree'].find_one(tag=parent) is not None:
				tx['tree'].update(dict(tag=tag, parent=parent), ['tag'])

	def deleteTag(self, tag):
		with dataset.connect('sqlite:///bookmarks.db') as tx:
			parent = tx['tree'].find_one(tag=tag)['parent']

			for el in tx['tree'].find(parent=tag):
				tx['tree'].upsert(dict(tag=el['tag'], parent=parent), ['tag'])

			tx['tree'].delete(tag=tag)
			tx['tags'].delete(tag=tag)
		
	def log_message(self, format, *args):
		# no messages
		pass

def runServer():
	myServer = HTTPServer((HOST_NAME, HOST_PORT), RequestHandler)

	print("starting server...")
	myServer.serve_forever()

import wx.adv
import wx

TRAY_TOOLTIP = 'bookmarks' 
TRAY_ICON = 'icon.png' 

class TaskBarIcon(wx.adv.TaskBarIcon):
	def __init__(self, frame):
		self.frame = frame
		super(TaskBarIcon, self).__init__()
		self.set_icon(TRAY_ICON)
		self.Bind(wx.adv.EVT_TASKBAR_LEFT_DOWN, self.on_left_down)

	def set_icon(self, path):
		icon = wx.Icon(path)
		self.SetIcon(icon, TRAY_TOOLTIP)

	def on_left_down(self, event):      
		pass

	def on_exit(self, event):
		wx.CallAfter(self.Destroy)
		self.frame.Close()

class App(wx.App):
	def OnInit(self):
		frame=wx.Frame(None)
		self.SetTopWindow(frame)
		TaskBarIcon(frame)
		return True

t = threading.Thread(target=runServer)
t.start()

app = App(False)
app.MainLoop()
