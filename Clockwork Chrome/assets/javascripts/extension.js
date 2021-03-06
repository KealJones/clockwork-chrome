class Extension
{
	constructor ($scope, requests) {
		this.$scope = $scope
		this.requests = requests
	}

	get api () { return chrome || browser }

	static runningAsExtension () {
		let api = chrome || browser
		return api && api.devtools
	}

	init () {
		this.useProperTheme()
		this.setMetadataUrl()
		this.setMetadataClient()

		this.listenToRequests()

		this.loadLastRequest()
	}

	useProperTheme () {
		if (this.api.devtools.panels.themeName === 'dark') {
			$('body').addClass('dark')
		}
	}

	setMetadataUrl () {
		this.api.devtools.inspectedWindow.eval('window.location.href', url => this.requests.setRemote(url))
	}

	setMetadataClient () {
		this.requests.setClient((url, headers, callback) => {
			this.api.runtime.sendMessage(
				{ action: 'getJSON', url, headers }, (data) => callback(data)
			)
		})
	}

	listenToRequests () {
		if (! this.api.devtools.network.onRequestFinished) {
			return this.listenToRequestsFirefox()
		}

		this.api.devtools.network.onRequestFinished.addListener(request => {
			let options = this.parseHeaders(request.response.headers)

			if (! options) return

			this.requests.setRemote(request.request.url, options)
			this.requests.loadId(options.id).then(() => {
				this.$scope.$apply(() => this.$scope.refreshRequests())
			})
		})
	}

	listenToRequestsFirefox () {
		this.api.runtime.onMessage.addListener(message => {
			let options = this.parseHeaders(message.request.responseHeaders)

			if (! options) return

			this.requests.setRemote(message.request.url, options)
			this.requests.loadId(options.id).then(() => {
				this.$scope.$apply(() => this.$scope.refreshRequests())
			})
		})
	}

	loadLastRequest () {
		this.api.runtime.sendMessage(
			{ action: 'getLastClockworkRequestInTab', tabId: this.api.devtools.inspectedWindow.tabId },
			(data) => {
				if (! data) return

				let options = this.parseHeaders(data.headers)

				this.requests.setRemote(data.url, options)
				this.requests.loadId(options.id).then(() => {
					this.requests.loadNext().then(() => {
						this.$scope.$apply(() => this.$scope.refreshRequests())
					})
				})
			}
		)
	}

	parseHeaders (requestHeaders) {
		let found
		let id = (found = requestHeaders.find((x) => x.name.toLowerCase() == 'x-clockwork-id'))
			? found.value : undefined
		let path = (found = requestHeaders.find((x) => x.name.toLowerCase() == 'x-clockwork-path'))
			? found.value : undefined

		if (! id) return

		let headers = {}
		requestHeaders.forEach((header) => {
			if (header.name.toLowerCase().indexOf('x-clockwork-header-') === 0) {
				let name = header.name.toLowerCase().replace('x-clockwork-header-', '')
				headers[originalName] = header.value
			}
		})

		return { id, path, headers }
	}
}
