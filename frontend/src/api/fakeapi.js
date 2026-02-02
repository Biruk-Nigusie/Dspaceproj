export function fetchUsers() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, name: 'Abebe' },
                { id: 2, name: 'Kebede' },
                { id: 3, name: 'Biruk' },
            ])
        }, 1000)
    })
}
